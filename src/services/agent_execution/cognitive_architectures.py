"""
Cognitive Architecture Executors for Agent Execution

Implements different reasoning and execution strategies for agents:
- ReAct: Reasoning + Acting loop (flexible, higher cost)
- Single-Step: Direct execution with single LLM call (low latency, low cost)
- Plan-and-Solve: Upfront planning + execution (balanced, 3.6x faster than ReAct)
- Custom: Extensible base class for custom architectures

Each executor returns a compiled LangGraph graph with ainvoke() interface
compatible with AgentExecutionService.

Implements:
- Strategy pattern for cognitive architecture selection
- Factory pattern for executor creation
- Proper logging and error handling
- Consistent interface across all executors

Story: 12.8 - Agent Type and Execution Strategy Implementation
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Annotated

from langchain_core.messages import BaseMessage, ToolMessage
from langchain_core.tools import BaseTool
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent
from typing_extensions import TypedDict

logger = logging.getLogger(__name__)


class CognitiveArchitectureExecutor(ABC):
    """
    Base class for cognitive architecture executors.

    Each executor implements a different reasoning and execution strategy
    and returns a compiled LangGraph graph that can be invoked with ainvoke().

    Attributes:
        llm: Initialized language model (ChatOpenAI with LiteLLM proxy)
        tools: List of LangChain tools available to the executor
    """

    def __init__(self, llm: Any, tools: list[Any]):
        """
        Initialize the executor.

        Args:
            llm: Initialized ChatOpenAI model with LiteLLM proxy
            tools: List of LangChain tool objects
        """
        self.llm = llm
        self.tools = tools

    @abstractmethod
    def create(self) -> Any:
        """
        Create and return the compiled LangGraph agent executor.

        Returns:
            Compiled LangGraph StateGraph with ainvoke() interface.
            The graph should accept state with "messages" key.
        """
        pass


class ReActExecutor(CognitiveArchitectureExecutor):
    """
    ReAct (Reasoning + Acting) Cognitive Architecture.

    Implements a flexible reasoning loop where the agent reasons about
    problems, calls tools, observes results, and repeats until done.

    Characteristics:
    - Most flexible reasoning pattern
    - Handles complex multi-step tasks well
    - Higher cost (multiple LLM calls)
    - Higher latency (multiple reasoning steps)
    - Best for: Complex reasoning, novel problems, exploratory tasks

    Uses LangGraph's built-in create_react_agent which implements the
    standard ReAct pattern from https://arxiv.org/abs/2210.03629

    Best Practices (2025):
    - Configurable recursion_limit to prevent infinite loops (default: 25)
    - Static prompt for consistent agent behavior
    - Error handling inherited from ToolNode

    Story: 12.8 - Cognitive Architecture Implementation
    IMPROVED: Story 12.10 - Added prompt parameter and recursion_limit config
    """

    # Default recursion limit to prevent infinite loops
    # Can be overridden at invoke time with config={"recursion_limit": N}
    DEFAULT_RECURSION_LIMIT = 25

    def __init__(self, llm: Any, tools: list[Any], prompt: str | None = None):
        """
        Initialize the ReAct executor.

        Args:
            llm: Initialized ChatOpenAI model with LiteLLM proxy
            tools: List of LangChain tool objects
            prompt: Optional static system prompt for agent behavior
        """
        super().__init__(llm, tools)
        self.prompt = prompt

    def create(self) -> Any:
        """
        Create ReAct agent executor with best practices.

        Returns:
            Compiled LangGraph StateGraph using create_react_agent.

        Best Practices Applied:
        - Uses LangGraph's create_react_agent with prompt parameter
        - Default recursion_limit of 25 (configurable at runtime)
        - Inherits error handling from ToolNode
        """
        logger.info(
            "Creating ReAct agent executor",
            extra={
                "tool_count": len(self.tools),
                "has_prompt": self.prompt is not None,
                "default_recursion_limit": self.DEFAULT_RECURSION_LIMIT,
            },
        )

        # Use LangGraph's built-in create_react_agent which implements
        # the standard ReAct pattern with proper tool calling and state management
        # Best Practice: Include prompt for consistent agent behavior
        if self.prompt:
            agent = create_react_agent(
                model=self.llm,
                tools=self.tools,
                prompt=self.prompt,
            )
        else:
            agent = create_react_agent(
                model=self.llm,
                tools=self.tools,
            )

        logger.debug(
            "ReAct executor created successfully",
            extra={
                "note": f"Invoke with config={{'recursion_limit': N}} to override default of {self.DEFAULT_RECURSION_LIMIT}",
            },
        )
        return agent


class SingleStepExecutor(CognitiveArchitectureExecutor):
    """
    Single-Step (Zero-Shot) Cognitive Architecture.

    Implements a minimal single-step execution where the agent reasons once,
    decides on tool calls, executes them, and synthesizes a final response.

    Characteristics:
    - Low latency (2 LLM calls + one tool execution round)
    - Low cost (minimal token usage)
    - Limited reasoning capability
    - Best for: Simple tasks, latency-sensitive applications, cost optimization

    Implementation:
    - Creates a simple four-node graph: LLM call -> Tool execution -> Synthesize -> Done
    - Binds tools to LLM upfront
    - Does NOT loop on tool results (single pass only)
    - Makes final LLM call to synthesize tool results into coherent response

    Graph Flow:
    START -> call_llm -> execute_tools -> synthesize_response -> END

    Best Practices (2025):
    - Final LLM call after tool execution to synthesize results
    - Clear separation between tool execution and response generation
    - Graceful handling when no tools are called

    Story: 12.8 - Cognitive Architecture Implementation
    IMPROVED: Story 12.10 - Added final synthesis step for coherent responses
    """

    def create(self) -> Any:
        """
        Create single-step agent executor with synthesis.

        Returns:
            Compiled LangGraph StateGraph with final synthesis step.
        """
        logger.info(
            "Creating Single-Step agent executor",
            extra={
                "tool_count": len(self.tools),
            },
        )

        # Define state schema for single-step execution
        class SingleStepState(TypedDict):
            messages: Annotated[list[BaseMessage], "The messages in the conversation"]
            has_tool_calls: Annotated[bool, "Whether the LLM made tool calls"]

        # Create graph
        graph = StateGraph(SingleStepState)

        # Bind tools to LLM for function calling
        llm_with_tools = self.llm.bind_tools(self.tools)

        async def call_llm(state: SingleStepState) -> SingleStepState:
            """Single LLM call with tool binding."""
            messages = state["messages"]
            response = await llm_with_tools.ainvoke(messages)

            # Check if LLM made tool calls
            has_tool_calls = (
                hasattr(response, "tool_calls")
                and response.tool_calls
                and len(response.tool_calls) > 0
            )

            return {
                "messages": messages + [response],
                "has_tool_calls": has_tool_calls,
            }

        async def execute_tools(state: SingleStepState) -> SingleStepState:
            """Execute all tool calls from LLM response (single pass)."""
            messages = state["messages"]
            last_message = messages[-1]

            # Check if last message has tool calls
            if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
                # No tool calls, return as-is
                return {"messages": messages, "has_tool_calls": False}

            # Execute all tool calls from the LLM response
            tool_results = []
            for tool_call in last_message.tool_calls:
                # Handle both dict-style and object-style tool calls
                # Different LLM providers may format tool_calls differently
                if isinstance(tool_call, dict):
                    tool_name = tool_call.get("name")
                    tool_input = tool_call.get("args", {})
                    tool_call_id = tool_call.get("id")
                else:
                    # Object-style tool call (e.g., ToolCall from langchain)
                    tool_name = getattr(tool_call, "name", None)
                    tool_input = getattr(tool_call, "args", {})
                    tool_call_id = getattr(tool_call, "id", None)

                # Find and execute the tool
                tool = next((t for t in self.tools if t.name == tool_name), None)
                if tool:
                    try:
                        # Use ainvoke for async tool execution (required for MCP tools)
                        result = await tool.ainvoke(tool_input)
                        tool_results.append(
                            ToolMessage(
                                content=str(result),
                                tool_call_id=tool_call_id,
                            )
                        )
                    except Exception as e:
                        tool_results.append(
                            ToolMessage(
                                content=f"Error executing {tool_name}: {str(e)}",
                                tool_call_id=tool_call_id,
                            )
                        )
                else:
                    tool_results.append(
                        ToolMessage(
                            content=f"Tool {tool_name} not found",
                            tool_call_id=tool_call_id,
                        )
                    )

            # Add tool results to messages
            new_messages = messages + tool_results

            logger.debug(
                "Single-step tool execution complete",
                extra={
                    "tool_calls": len(last_message.tool_calls),
                    "tool_results": len(tool_results),
                },
            )

            return {"messages": new_messages, "has_tool_calls": True}

        async def synthesize_response(state: SingleStepState) -> SingleStepState:
            """
            Final LLM call to synthesize tool results into coherent response.

            This step is critical for user experience - without it, the output
            would be raw tool results rather than a synthesized answer.
            """
            messages = state["messages"]
            has_tool_calls = state.get("has_tool_calls", False)

            # Only synthesize if tools were called
            if not has_tool_calls:
                logger.debug("No tool calls made, skipping synthesis")
                return {"messages": messages, "has_tool_calls": False}

            # Make final LLM call to synthesize results (without tools bound)
            # This ensures the LLM generates a natural language response
            synthesis_response = await self.llm.ainvoke(messages)

            logger.debug(
                "Single-step synthesis complete",
                extra={
                    "response_length": len(str(synthesis_response.content)),
                },
            )

            return {
                "messages": messages + [synthesis_response],
                "has_tool_calls": True,
            }

        # Build graph: START -> LLM -> Tools -> Synthesize -> END
        graph.add_node("call_llm", call_llm)
        graph.add_node("execute_tools", execute_tools)
        graph.add_node("synthesize_response", synthesize_response)
        graph.add_edge(START, "call_llm")
        graph.add_edge("call_llm", "execute_tools")
        graph.add_edge("execute_tools", "synthesize_response")
        graph.add_edge("synthesize_response", END)

        # Compile and return
        compiled = graph.compile()
        logger.debug("Single-Step executor created successfully with synthesis step")
        return compiled


class PlanAndSolveExecutor(CognitiveArchitectureExecutor):
    """
    Plan-and-Solve Cognitive Architecture with Iterative Execution.

    Implements a multi-phase execution strategy based on LangGraph's Plan-and-Execute:
    1. Planning Phase: Agent creates detailed step-by-step plan
    2. Execution Loop: Agent executes plan steps iteratively with tools
    3. Conditional Routing: Continues until agent signals completion or max iterations

    Characteristics:
    - 3.6x faster than ReAct (research shows)
    - 50-60% cheaper than ReAct
    - Better structured problem-solving
    - Iterative execution ensures all plan steps complete
    - Max iterations safeguard prevents infinite loops

    Implementation:
    - Phase 1: LLM creates explicit step-by-step plan
    - Phase 2: LLM executes plan iteratively, calling tools for each step
    - Conditional edge checks if more work needed or agent is done
    - Plan guides execution, reducing unnecessary LLM calls

    Graph Flow:
    START -> create_plan -> execute_step -> [should_continue?] -> execute_step (loop) OR END

    Based on research:
    - LangGraph Plan-and-Execute: https://langchain-ai.github.io/langgraph/tutorials/plan-and-execute/
    - "Plan-and-Solve Prompting": https://arxiv.org/abs/2305.04091

    Story: 12.8 - Cognitive Architecture Implementation
    BUGFIX: Story 12.10 - Added iterative execution loop (was single-pass before)
    """

    # Maximum iterations to prevent infinite loops
    # Increased from 10 to 25 for complex research tasks (Story 12.10 fix)
    MAX_ITERATIONS = 25

    def create(self) -> Any:
        """
        Create plan-and-solve agent executor with iterative execution.

        Returns:
            Compiled LangGraph StateGraph with planning + iterative execution phases.
        """
        logger.info(
            "Creating Plan-and-Solve agent executor (iterative)",
            extra={
                "tool_count": len(self.tools),
                "max_iterations": self.MAX_ITERATIONS,
            },
        )

        # Define state schema with iteration tracking
        class PlanAndSolveState(TypedDict):
            messages: Annotated[list[BaseMessage], "The messages in the conversation"]
            plan: Annotated[str, "The plan created by the agent"]
            iteration: Annotated[int, "Current iteration count"]
            is_complete: Annotated[bool, "Whether the agent has signaled completion"]
            tools_called: Annotated[list[str], "List of tool names called during execution"]
            completion_reminder_sent: Annotated[bool, "Whether output reminder was sent"]
            last_chance_reminder_sent: Annotated[
                bool, "Whether max-iterations output reminder was sent"
            ]

        # Output tool patterns - tools that produce side effects / outputs
        # Agent should call at least one of these before finishing
        OUTPUT_TOOL_PATTERNS = [
            "add_comment", "create_", "update_", "post_", "send_",
            "jira_add_comment", "jira_create", "jira_update", "jira_transition",
            "slack_post", "email_send", "webhook_",
        ]

        def _is_output_tool(tool_name: str) -> bool:
            """Check if a tool name matches output tool patterns."""
            tool_lower = tool_name.lower()
            return any(pattern in tool_lower for pattern in OUTPUT_TOOL_PATTERNS)

        # Create graph
        graph = StateGraph(PlanAndSolveState)

        async def create_plan(state: PlanAndSolveState) -> PlanAndSolveState:
            """
            Phase 1: Create a step-by-step plan.

            The LLM analyzes the problem and creates an explicit plan
            before attempting to solve it.
            """
            messages = state["messages"]

            # Add planning instruction to the user message
            planning_instruction = (
                "\n\n[PLANNING PHASE] "
                "Before solving this problem, create a detailed step-by-step plan. "
                "For each step, specify what tools or reasoning you'll use. "
                "Be concrete and specific about the approach. "
                "Number each step clearly (Step 1, Step 2, etc.)."
            )

            # Modify last message to include planning instruction
            modified_messages = messages.copy()
            last_msg = modified_messages[-1]
            if hasattr(last_msg, "content"):
                modified_messages[-1] = type(last_msg)(
                    content=last_msg.content + planning_instruction
                )

            # Get plan from LLM (async invocation)
            plan_response = await self.llm.ainvoke(modified_messages)
            plan_text = (
                plan_response.content
                if hasattr(plan_response, "content")
                else str(plan_response)
            )

            logger.debug(
                "Plan created",
                extra={
                    "plan_length": len(plan_text),
                },
            )

            return {
                "messages": messages + [plan_response],
                "plan": plan_text,
                "iteration": 0,
                "is_complete": False,
                "tools_called": [],
                "completion_reminder_sent": False,
                "last_chance_reminder_sent": False,
            }

        async def execute_step(state: PlanAndSolveState) -> PlanAndSolveState:
            """
            Execute next step of the plan with tool support.

            This node is called iteratively until:
            - Agent signals completion (no more tool calls needed)
            - Max iterations reached

            IMPROVEMENT (Story 12.10): Tracks tools_called to detect when agent
            tries to complete without having called any output tools. Sends a
            reminder in that case to enforce workflow completion.
            """
            messages = state["messages"]
            plan = state["plan"]
            iteration = state.get("iteration", 0) + 1
            tools_called = state.get("tools_called", [])
            completion_reminder_sent = state.get("completion_reminder_sent", False)
            last_chance_reminder_sent = state.get("last_chance_reminder_sent", False)

            logger.info(
                f"Plan-and-solve execution iteration {iteration}",
                extra={
                    "iteration": iteration,
                    "max_iterations": self.MAX_ITERATIONS,
                    "message_count": len(messages),
                    "tools_called_so_far": len(tools_called),
                },
            )

            # LAST CHANCE CHECK: If approaching max iterations without output tools,
            # inject a strong reminder before proceeding (Story 12.10 fix)
            # This ensures the agent gets the message BEFORE being force-stopped
            has_output_tool = any(_is_output_tool(tool) for tool in tools_called)

            if (
                iteration >= self.MAX_ITERATIONS - 2  # 2 iterations left
                and not has_output_tool
                and not last_chance_reminder_sent
            ):
                logger.warning(
                    "LAST CHANCE: Approaching max iterations without output tool",
                    extra={
                        "iteration": iteration,
                        "max_iterations": self.MAX_ITERATIONS,
                        "tools_called": tools_called,
                    },
                )

                # Get list of available output tools
                available_output_tools = [
                    t.name for t in self.tools if _is_output_tool(t.name)
                ]
                output_tools_str = ", ".join(available_output_tools[:5])

                from langchain_core.messages import HumanMessage

                last_chance_msg = HumanMessage(
                    content=(
                        f"[CRITICAL - LAST CHANCE TO COMPLETE TASK] "
                        f"You have only {self.MAX_ITERATIONS - iteration} iterations "
                        f"remaining and you MUST call an output tool to complete the task! "
                        f"Your research has gathered enough information. "
                        f"NOW call one of these tools to post your findings: {output_tools_str}. "
                        f"For Jira tickets, use jira_add_comment to post your analysis. "
                        f"DO NOT do more research - call the output tool NOW!"
                    )
                )
                messages = messages + [last_chance_msg]

                # Continue execution but mark that we sent the last chance reminder
                # Don't return early - let the agent process this message
                last_chance_reminder_sent = True

            # Bind tools to LLM
            llm_with_tools = self.llm.bind_tools(self.tools)

            # For first iteration, add solving instruction with full plan
            if iteration == 1:
                solving_instruction = (
                    f"\n\n[SOLVING PHASE - Iteration {iteration}] "
                    f"Execute this plan step-by-step:\n{plan}\n\n"
                    f"Work through each step using the available tools. "
                    f"After each tool result, continue to the next step. "
                    f"When ALL steps are complete, provide a final summary without calling more tools."
                )

                # Build messages for solving phase
                solving_messages = messages.copy()
                last_msg = solving_messages[-1]
                if hasattr(last_msg, "content"):
                    solving_messages[-1] = type(last_msg)(
                        content=last_msg.content + solving_instruction
                    )
                messages = solving_messages
            else:
                # For subsequent iterations, add continuation instruction
                from langchain_core.messages import HumanMessage
                continuation_msg = HumanMessage(
                    content=(
                        f"[CONTINUE - Iteration {iteration}] "
                        f"Continue executing the remaining steps of your plan. "
                        f"If all steps are complete, provide a final summary without calling more tools."
                    )
                )
                messages = messages + [continuation_msg]

            # Get response from LLM with tools available
            response = await llm_with_tools.ainvoke(messages)
            messages = messages + [response]

            # Check if agent made tool calls
            has_tool_calls = hasattr(response, "tool_calls") and response.tool_calls

            if has_tool_calls:
                # Execute all tool calls from this iteration
                available_tool_names = [t.name for t in self.tools]
                logger.info(
                    "Plan-and-solve tool execution",
                    extra={
                        "iteration": iteration,
                        "available_tools": available_tool_names,
                        "available_tool_count": len(available_tool_names),
                        "requested_tool_calls": len(response.tool_calls),
                    },
                )

                tool_results = []
                new_tools_called = []
                for tool_call in response.tool_calls:
                    # Handle both dict-style and object-style tool calls
                    if isinstance(tool_call, dict):
                        tool_name = tool_call.get("name")
                        tool_input = tool_call.get("args", {})
                        tool_call_id = tool_call.get("id")
                    else:
                        tool_name = getattr(tool_call, "name", None)
                        tool_input = getattr(tool_call, "args", {})
                        tool_call_id = getattr(tool_call, "id", None)

                    # Track this tool call
                    if tool_name:
                        new_tools_called.append(tool_name)

                    # Find and execute the tool
                    tool = next(
                        (t for t in self.tools if t.name == tool_name), None
                    )

                    if not tool:
                        logger.warning(
                            f"Tool not found in available tools",
                            extra={
                                "requested_tool_name": tool_name,
                                "available_tools": available_tool_names,
                            },
                        )

                    if tool:
                        try:
                            result = await tool.ainvoke(tool_input)
                            tool_results.append(
                                ToolMessage(
                                    content=str(result),
                                    tool_call_id=tool_call_id,
                                )
                            )
                            logger.debug(
                                f"Tool executed successfully",
                                extra={
                                    "tool_name": tool_name,
                                    "result_length": len(str(result)),
                                },
                            )
                        except Exception as e:
                            logger.error(
                                f"Tool execution error: {e}",
                                extra={
                                    "tool_name": tool_name,
                                    "error": str(e),
                                },
                            )
                            tool_results.append(
                                ToolMessage(
                                    content=f"Error executing {tool_name}: {str(e)}",
                                    tool_call_id=tool_call_id,
                                )
                            )
                    else:
                        tool_results.append(
                            ToolMessage(
                                content=f"Tool {tool_name} not found",
                                tool_call_id=tool_call_id,
                            )
                        )

                # Add tool results to messages
                messages = messages + tool_results

                # Update tools_called list
                updated_tools_called = tools_called + new_tools_called

                logger.debug(
                    f"Iteration {iteration} tool execution complete",
                    extra={
                        "tool_calls": len(response.tool_calls),
                        "tool_results": len(tool_results),
                        "total_tools_called": len(updated_tools_called),
                    },
                )

                return {
                    "messages": messages,
                    "plan": plan,
                    "iteration": iteration,
                    "is_complete": False,  # More work may be needed
                    "tools_called": updated_tools_called,
                    "completion_reminder_sent": completion_reminder_sent,
                    "last_chance_reminder_sent": last_chance_reminder_sent,
                }
            else:
                # No tool calls - check if agent should really complete
                # Story 12.10: Detect when agent tries to end without output tools
                has_output_tool = any(
                    _is_output_tool(tool) for tool in tools_called
                )

                # If no output tools called and reminder hasn't been sent, nudge the agent
                if not has_output_tool and not completion_reminder_sent:
                    # Get list of available output tools for the reminder
                    available_output_tools = [
                        t.name for t in self.tools if _is_output_tool(t.name)
                    ]

                    logger.warning(
                        "Agent trying to complete without calling output tools - sending reminder",
                        extra={
                            "iteration": iteration,
                            "tools_called": tools_called,
                            "available_output_tools": available_output_tools,
                        },
                    )

                    # Add reminder message
                    from langchain_core.messages import HumanMessage
                    output_tools_str = ", ".join(available_output_tools[:5])  # Limit to 5
                    reminder_msg = HumanMessage(
                        content=(
                            f"[IMPORTANT - OUTPUT REQUIRED] You haven't completed the task yet! "
                            f"You need to call one of the output tools to deliver the results: "
                            f"{output_tools_str}. "
                            f"Please call the appropriate tool NOW to post your findings/results. "
                            f"For Jira tickets, use jira_add_comment to post your analysis. "
                            f"Do NOT just provide a text response - you MUST call the output tool."
                        )
                    )
                    messages = messages + [reminder_msg]

                    return {
                        "messages": messages,
                        "plan": plan,
                        "iteration": iteration,
                        "is_complete": False,  # Force continuation
                        "tools_called": tools_called,
                        "completion_reminder_sent": True,  # Mark reminder sent
                        "last_chance_reminder_sent": last_chance_reminder_sent,
                    }

                # Agent has finished (either has output tools or reminder already sent)
                logger.info(
                    f"Plan-and-solve completed at iteration {iteration} (no more tool calls)",
                    extra={
                        "iteration": iteration,
                        "final_message_count": len(messages),
                        "has_output_tool": has_output_tool,
                        "tools_called": tools_called,
                    },
                )

                return {
                    "messages": messages,
                    "plan": plan,
                    "iteration": iteration,
                    "is_complete": True,
                    "tools_called": tools_called,
                    "completion_reminder_sent": completion_reminder_sent,
                    "last_chance_reminder_sent": last_chance_reminder_sent,
                }

        def should_continue(state: PlanAndSolveState) -> str:
            """
            Conditional edge: decide whether to continue execution or end.

            Returns:
                "execute_step" to continue, "end" to finish
            """
            iteration = state.get("iteration", 0)
            is_complete = state.get("is_complete", False)
            tools_called = state.get("tools_called", [])
            completion_reminder_sent = state.get("completion_reminder_sent", False)

            # End if agent signaled completion
            if is_complete:
                logger.debug(
                    "Agent signaled completion",
                    extra={
                        "iteration": iteration,
                        "tools_called": tools_called,
                        "completion_reminder_sent": completion_reminder_sent,
                    },
                )
                return "end"

            # End if max iterations reached
            if iteration >= self.MAX_ITERATIONS:
                logger.warning(
                    f"Max iterations ({self.MAX_ITERATIONS}) reached, ending execution",
                    extra={
                        "iteration": iteration,
                        "tools_called": tools_called,
                    },
                )
                return "end"

            # Continue execution
            logger.debug(
                f"Continuing to next iteration",
                extra={
                    "current_iteration": iteration,
                    "completion_reminder_sent": completion_reminder_sent,
                },
            )
            return "execute_step"

        # Build graph with conditional routing
        # START -> create_plan -> execute_step -> [should_continue?] -> execute_step OR END
        graph.add_node("create_plan", create_plan)
        graph.add_node("execute_step", execute_step)

        graph.add_edge(START, "create_plan")
        graph.add_edge("create_plan", "execute_step")

        # Conditional edge: loop back to execute_step or go to END
        graph.add_conditional_edges(
            "execute_step",
            should_continue,
            {
                "execute_step": "execute_step",
                "end": END,
            },
        )

        # Compile and return
        compiled = graph.compile()
        logger.debug("Plan-and-Solve executor (iterative) created successfully")
        return compiled


class CognitiveArchitectureFactory:
    """
    Factory for creating cognitive architecture executors.

    Uses the Factory pattern to instantiate the correct executor
    based on the requested cognitive architecture type.

    Supports:
    - react: ReAct executor
    - single_step: Single-step executor
    - plan_and_solve: Plan-and-solve executor

    Story: 12.8 - Cognitive Architecture Implementation
    """

    # Map architecture names to executor classes
    _executors = {
        "react": ReActExecutor,
        "single_step": SingleStepExecutor,
        "plan_and_solve": PlanAndSolveExecutor,
    }

    @classmethod
    def create_executor(
        cls,
        architecture: str,
        llm: Any,
        tools: list[Any],
    ) -> Any:
        """
        Create a cognitive architecture executor.

        Args:
            architecture: Cognitive architecture type (react, single_step, plan_and_solve)
            llm: Initialized ChatOpenAI model with LiteLLM proxy
            tools: List of LangChain tool objects

        Returns:
            Compiled LangGraph StateGraph with ainvoke() interface

        Raises:
            ValueError: If architecture type is not supported

        Story: 12.8 - Cognitive Architecture Implementation
        """
        architecture_lower = architecture.lower()

        if architecture_lower not in cls._executors:
            logger.warning(
                "Unknown cognitive architecture, defaulting to ReAct",
                extra={
                    "requested_architecture": architecture,
                    "supported": list(cls._executors.keys()),
                },
            )
            architecture_lower = "react"

        executor_class = cls._executors[architecture_lower]
        executor = executor_class(llm=llm, tools=tools)

        logger.debug(
            "Cognitive architecture executor created",
            extra={
                "architecture": architecture_lower,
                "executor_class": executor_class.__name__,
            },
        )

        return executor.create()

    @classmethod
    def register_executor(cls, architecture: str, executor_class: type) -> None:
        """
        Register a custom cognitive architecture executor.

        Allows extending the factory with custom executor implementations.

        Args:
            architecture: Architecture type name (e.g., "custom_reasoning")
            executor_class: Executor class inheriting from CognitiveArchitectureExecutor

        Story: 12.8 - Cognitive Architecture Implementation
        """
        if not issubclass(executor_class, CognitiveArchitectureExecutor):
            raise TypeError(
                f"Executor class must inherit from CognitiveArchitectureExecutor, "
                f"got {executor_class}"
            )

        cls._executors[architecture.lower()] = executor_class
        logger.info(
            "Custom cognitive architecture executor registered",
            extra={
                "architecture": architecture,
                "executor_class": executor_class.__name__,
            },
        )
