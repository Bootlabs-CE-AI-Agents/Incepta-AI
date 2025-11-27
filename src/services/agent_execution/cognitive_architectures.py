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

    Story: 12.8 - Cognitive Architecture Implementation
    """

    def create(self) -> Any:
        """
        Create ReAct agent executor.

        Returns:
            Compiled LangGraph StateGraph using create_react_agent.
        """
        logger.info(
            "Creating ReAct agent executor",
            extra={
                "tool_count": len(self.tools),
            },
        )

        # Use LangGraph's built-in create_react_agent which implements
        # the standard ReAct pattern with proper tool calling and state management
        agent = create_react_agent(model=self.llm, tools=self.tools)

        logger.debug("ReAct executor created successfully")
        return agent


class SingleStepExecutor(CognitiveArchitectureExecutor):
    """
    Single-Step (Zero-Shot) Cognitive Architecture.

    Implements a minimal single-step execution where the agent reasons once,
    decides on tool calls, executes them, and returns the result in one pass.

    Characteristics:
    - Lowest latency (single LLM call + one tool execution round)
    - Lowest cost (minimal token usage)
    - Limited reasoning capability
    - Best for: Simple tasks, latency-sensitive applications, cost optimization

    Implementation:
    - Creates a simple three-node graph: LLM call -> Tool execution -> Done
    - Binds tools to LLM upfront
    - Does NOT loop on tool results (single pass only)
    - Returns results after single tool execution round

    Graph Flow:
    START -> call_llm -> execute_tools -> END

    Story: 12.8 - Cognitive Architecture Implementation
    """

    def create(self) -> Any:
        """
        Create single-step agent executor with minimal loop.

        Returns:
            Compiled LangGraph StateGraph with no reasoning loop.
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

        # Create graph
        graph = StateGraph(SingleStepState)

        # Bind tools to LLM for function calling
        llm_with_tools = self.llm.bind_tools(self.tools)

        def call_llm(state: SingleStepState) -> SingleStepState:
            """Single LLM call with tool binding."""
            messages = state["messages"]
            response = llm_with_tools.invoke(messages)
            return {"messages": messages + [response]}

        def execute_tools(state: SingleStepState) -> SingleStepState:
            """Execute all tool calls from LLM response (single pass)."""
            messages = state["messages"]
            last_message = messages[-1]

            # Check if last message has tool calls
            if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
                # No tool calls, return as-is
                return {"messages": messages}

            # Execute all tool calls from the LLM response
            tool_results = []
            for tool_call in last_message.tool_calls:
                tool_name = tool_call.get("name")
                tool_input = tool_call.get("args", {})

                # Find and execute the tool
                tool = next((t for t in self.tools if t.name == tool_name), None)
                if tool:
                    try:
                        result = tool.invoke(tool_input)
                        tool_results.append(
                            ToolMessage(
                                content=str(result),
                                tool_call_id=tool_call.get("id"),
                            )
                        )
                    except Exception as e:
                        tool_results.append(
                            ToolMessage(
                                content=f"Error executing {tool_name}: {str(e)}",
                                tool_call_id=tool_call.get("id"),
                            )
                        )
                else:
                    tool_results.append(
                        ToolMessage(
                            content=f"Tool {tool_name} not found",
                            tool_call_id=tool_call.get("id"),
                        )
                    )

            # Add tool results to messages
            new_messages = messages + tool_results

            logger.debug(
                "Single-step execution complete",
                extra={
                    "tool_calls": len(last_message.tool_calls),
                    "tool_results": len(tool_results),
                },
            )

            return {"messages": new_messages}

        # Build graph: START -> LLM -> Tools -> END (no loop)
        graph.add_node("call_llm", call_llm)
        graph.add_node("execute_tools", execute_tools)
        graph.add_edge(START, "call_llm")
        graph.add_edge("call_llm", "execute_tools")
        graph.add_edge("execute_tools", END)

        # Compile and return
        compiled = graph.compile()
        logger.debug("Single-Step executor created successfully")
        return compiled


class PlanAndSolveExecutor(CognitiveArchitectureExecutor):
    """
    Plan-and-Solve Cognitive Architecture.

    Implements a two-phase execution strategy:
    1. Planning Phase: Agent creates detailed step-by-step plan
    2. Solving Phase: Agent executes plan with tools, reasoning through each step

    Characteristics:
    - 3.6x faster than ReAct (research shows)
    - 50-60% cheaper than ReAct
    - Better structured problem-solving
    - Better for: Well-defined tasks, cost-sensitive applications, known problem spaces

    Implementation:
    - Phase 1: LLM creates explicit step-by-step plan
    - Phase 2: LLM executes plan, calling tools for each step
    - Plan guides execution, reducing unnecessary LLM calls

    Graph Flow:
    START -> create_plan -> solve_with_plan -> END

    Based on research:
    - "Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models"
    - https://arxiv.org/abs/2305.04091

    Story: 12.8 - Cognitive Architecture Implementation
    """

    def create(self) -> Any:
        """
        Create plan-and-solve agent executor with planning phase.

        Returns:
            Compiled LangGraph StateGraph with planning + execution phases.
        """
        logger.info(
            "Creating Plan-and-Solve agent executor",
            extra={
                "tool_count": len(self.tools),
            },
        )

        # Define state schema
        class PlanAndSolveState(TypedDict):
            messages: Annotated[list[BaseMessage], "The messages in the conversation"]
            plan: Annotated[str, "The plan created by the agent"]

        # Create graph
        graph = StateGraph(PlanAndSolveState)

        def create_plan(state: PlanAndSolveState) -> PlanAndSolveState:
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
                "Be concrete and specific about the approach."
            )

            # Modify last message to include planning instruction
            modified_messages = messages.copy()
            last_msg = modified_messages[-1]
            if hasattr(last_msg, "content"):
                modified_messages[-1] = type(last_msg)(
                    content=last_msg.content + planning_instruction
                )

            # Get plan from LLM
            plan_response = self.llm.invoke(modified_messages)
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
            }

        def solve_with_plan(state: PlanAndSolveState) -> PlanAndSolveState:
            """
            Phase 2: Execute the plan with tool support.

            The LLM references the plan and solves the problem step-by-step,
            using tools as needed.
            """
            messages = state["messages"]
            plan = state["plan"]

            # Bind tools to LLM
            llm_with_tools = self.llm.bind_tools(self.tools)

            # Add solving instruction with the plan
            solving_instruction = (
                f"\n\n[SOLVING PHASE] "
                f"Now execute this plan step-by-step:\n{plan}\n\n"
                f"For each step, use the available tools as needed. "
                f"Call tools, observe the results, and proceed to the next step."
            )

            # Build messages for solving phase
            solving_messages = messages.copy()
            last_msg = solving_messages[-1]
            if hasattr(last_msg, "content"):
                solving_messages[-1] = type(last_msg)(
                    content=last_msg.content + solving_instruction
                )

            # Get initial response from LLM with tools available
            response = llm_with_tools.invoke(solving_messages)
            messages = solving_messages + [response]

            # Execute tools (single round based on plan)
            if hasattr(response, "tool_calls") and response.tool_calls:
                # DEBUG: Log available tools and requested tool names
                available_tool_names = [t.name for t in self.tools]
                logger.info(
                    "Plan-and-solve tool execution",
                    extra={
                        "available_tools": available_tool_names,
                        "available_tool_count": len(available_tool_names),
                        "requested_tool_calls": len(response.tool_calls),
                    },
                )

                tool_results = []
                for tool_call in response.tool_calls:
                    tool_name = tool_call.get("name")
                    tool_input = tool_call.get("args", {})

                    # Find and execute the tool
                    tool = next(
                        (t for t in self.tools if t.name == tool_name), None
                    )

                    # DEBUG: Log tool lookup result
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
                            result = tool.invoke(tool_input)
                            tool_results.append(
                                ToolMessage(
                                    content=str(result),
                                    tool_call_id=tool_call.get("id"),
                                )
                            )
                        except Exception as e:
                            tool_results.append(
                                ToolMessage(
                                    content=f"Error executing {tool_name}: {str(e)}",
                                    tool_call_id=tool_call.get("id"),
                                )
                            )
                    else:
                        tool_results.append(
                            ToolMessage(
                                content=f"Tool {tool_name} not found",
                                tool_call_id=tool_call.get("id"),
                            )
                        )

                # Add tool results to messages
                messages = messages + tool_results

                # Get final response from LLM based on tool results
                final_response = llm_with_tools.invoke(messages)
                messages = messages + [final_response]

                logger.debug(
                    "Plan-and-solve execution complete",
                    extra={
                        "tool_calls": len(response.tool_calls),
                        "tool_results": len(tool_results),
                    },
                )
            else:
                logger.debug("Plan-and-solve completed without tool calls")

            return {
                "messages": messages,
                "plan": plan,
            }

        # Build graph: START -> Plan -> Solve -> END
        graph.add_node("create_plan", create_plan)
        graph.add_node("solve_with_plan", solve_with_plan)
        graph.add_edge(START, "create_plan")
        graph.add_edge("create_plan", "solve_with_plan")
        graph.add_edge("solve_with_plan", END)

        # Compile and return
        compiled = graph.compile()
        logger.debug("Plan-and-Solve executor created successfully")
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
