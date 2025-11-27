"""
Agent Type Initializers for Different Agent Purposes

Implements different initialization strategies for various agent types:
- Tool-Based: Optimized for tool-heavy workflows with structured outputs
- Conversational: Optimized for natural dialogue and reasoning
- LangGraph: Custom LangGraph execution for complex workflows
- Custom: User-defined agent initialization logic

Each initializer prepares the agent context, system prompt refinement,
and tool binding strategy specific to the agent type.

Implements:
- Strategy pattern for agent type initialization
- Factory pattern for initializer creation
- System prompt augmentation based on agent type
- Tool binding optimization per agent type

Story: 12.8 - Agent Type and Execution Strategy Implementation
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Optional

logger = logging.getLogger(__name__)


class AgentTypeInitializer(ABC):
    """
    Base class for agent type initializers.

    Each initializer configures an agent based on its type,
    optimizing system prompts, tool handling, and execution strategy.

    Attributes:
        agent_type: Agent type (tool_based, conversational, langgraph, custom)
        agent_id: UUID of the agent being initialized
        system_prompt: Base system prompt from agent configuration
        tools: List of available LangChain tools
    """

    def __init__(
        self,
        agent_type: str,
        agent_id: str,
        system_prompt: str,
        tools: list[Any],
    ):
        """
        Initialize the agent type initializer.

        Args:
            agent_type: Type of agent (tool_based, conversational, langgraph, custom)
            agent_id: UUID of the agent
            system_prompt: Base system prompt from database
            tools: List of LangChain tool objects
        """
        self.agent_type = agent_type
        self.agent_id = agent_id
        self.system_prompt = system_prompt
        self.tools = tools

    @abstractmethod
    def augment_system_prompt(self) -> str:
        """
        Augment the base system prompt with type-specific guidance.

        Returns:
            Enhanced system prompt with type-specific instructions.
        """
        pass

    @abstractmethod
    def get_tool_binding_strategy(self) -> str:
        """
        Get the tool binding strategy for this agent type.

        Returns:
            Strategy type: "strict", "flexible", "structured", etc.
        """
        pass

    def initialize(self) -> dict[str, Any]:
        """
        Initialize the agent with type-specific configuration.

        Returns:
            Dictionary with agent initialization context:
            - system_prompt: Augmented system prompt
            - tool_binding_strategy: How to bind tools
            - type_config: Type-specific configuration
        """
        return {
            "system_prompt": self.augment_system_prompt(),
            "tool_binding_strategy": self.get_tool_binding_strategy(),
            "agent_type": self.agent_type,
            "tool_count": len(self.tools),
        }


class ToolBasedAgentInitializer(AgentTypeInitializer):
    """
    Tool-Based Agent Initializer.

    Optimizes agents for task automation with structured tool calling
    and explicit action-result patterns.

    Characteristics:
    - Focus on tool accuracy and structured outputs
    - Explicit tool selection guidance
    - Preference for deterministic execution
    - Best for: Automation, data processing, integration tasks

    Prompt Augmentation:
    - Emphasizes thinking before tool selection
    - Provides clear tool descriptions
    - Expects structured reasoning
    - Avoids ambiguity in action selection

    Story: 12.8 - Agent Type Implementation
    """

    TOOL_BASED_PROMPT_SUFFIX = """

## Tool Usage Guidelines
- You have access to specific tools for task automation
- Before calling any tool, think through which tool best matches the current need
- Provide clear reasoning for each tool call
- Use tools in logical sequences to accomplish the goal
- Pay attention to tool parameters and required fields
- If a tool fails, analyze the error and try an alternative approach
- Prioritize accuracy and completeness in tool invocations"""

    def augment_system_prompt(self) -> str:
        """
        Augment system prompt for tool-based agent.

        Adds specific guidance about tool selection and structured execution.
        """
        return self.system_prompt + self.TOOL_BASED_PROMPT_SUFFIX

    def get_tool_binding_strategy(self) -> str:
        """Tool-based agents use strict tool binding for accuracy."""
        return "strict"


class ConversationalAgentInitializer(AgentTypeInitializer):
    """
    Conversational Agent Initializer.

    Optimizes agents for natural dialogue, reasoning,
    and conversational problem-solving.

    Characteristics:
    - Focus on clarity and explanation
    - Flexible tool usage when beneficial
    - Emphasis on reasoning and thinking
    - Best for: Assistance, education, consultation tasks

    Prompt Augmentation:
    - Encourages clear explanation of reasoning
    - Allows for natural conversation flow
    - Tools are optional enhancements
    - Values clarity over strict structure

    Story: 12.8 - Agent Type Implementation
    """

    CONVERSATIONAL_PROMPT_SUFFIX = """

## Conversation Guidelines
- Focus on clear, natural communication
- Explain your reasoning to help the user understand your thinking
- You have access to tools, but use them when they add value to the conversation
- If you use tools, explain why you're using them and what you're trying to learn
- Acknowledge uncertainty when appropriate
- Ask clarifying questions if needed to provide better assistance
- Maintain context across the conversation"""

    def augment_system_prompt(self) -> str:
        """
        Augment system prompt for conversational agent.

        Adds guidance about natural dialogue and flexible reasoning.
        """
        return self.system_prompt + self.CONVERSATIONAL_PROMPT_SUFFIX

    def get_tool_binding_strategy(self) -> str:
        """Conversational agents use flexible tool binding."""
        return "flexible"


class LangGraphAgentInitializer(AgentTypeInitializer):
    """
    LangGraph Agent Initializer.

    Optimizes agents for custom LangGraph workflow execution,
    enabling complex multi-step reasoning graphs.

    Characteristics:
    - Support for custom workflow graphs
    - Multi-step state management
    - Complex decision logic support
    - Best for: Complex workflows, custom logic, advanced orchestration

    Prompt Augmentation:
    - Minimal augmentation (custom graph handles flow)
    - Focuses on task definition
    - Assumes external graph management

    Story: 12.8 - Agent Type Implementation
    """

    LANGGRAPH_PROMPT_SUFFIX = """

## LangGraph Execution
- Your responses will be processed through a custom workflow graph
- Follow the specific input/output format expected by the graph
- Provide structured responses that the workflow can parse
- Consider the workflow state when formulating responses"""

    def augment_system_prompt(self) -> str:
        """
        Augment system prompt for LangGraph agent.

        Minimal augmentation since the custom graph handles flow.
        """
        return self.system_prompt + self.LANGGRAPH_PROMPT_SUFFIX

    def get_tool_binding_strategy(self) -> str:
        """LangGraph agents use structured binding for workflow integration."""
        return "structured"


class CustomAgentInitializer(AgentTypeInitializer):
    """
    Custom Agent Initializer.

    Provides base initialization for user-defined agent types.
    Allows flexibility for custom implementations.

    Characteristics:
    - User-defined behavior
    - No enforced prompt augmentation
    - Extensible for custom logic
    - Best for: Experimental, specialized, research use cases

    Implementation:
    - Respects the base system prompt as-is
    - Minimal guidance
    - Allows complete customization

    Story: 12.8 - Agent Type Implementation
    """

    def augment_system_prompt(self) -> str:
        """
        Custom agents use the system prompt as-is.

        No type-specific augmentation for maximum flexibility.
        """
        return self.system_prompt

    def get_tool_binding_strategy(self) -> str:
        """Custom agents use flexible tool binding."""
        return "flexible"


class AgentTypeFactory:
    """
    Factory for creating agent type initializers.

    Uses the Factory pattern to instantiate the correct initializer
    based on the requested agent type.

    Supports:
    - tool_based: ToolBasedAgentInitializer
    - conversational: ConversationalAgentInitializer
    - langgraph: LangGraphAgentInitializer
    - custom: CustomAgentInitializer

    Story: 12.8 - Agent Type Implementation
    """

    # Map agent types to initializer classes
    _initializers = {
        "tool_based": ToolBasedAgentInitializer,
        "conversational": ConversationalAgentInitializer,
        "langgraph": LangGraphAgentInitializer,
        "custom": CustomAgentInitializer,
    }

    @classmethod
    def create_initializer(
        cls,
        agent_type: str,
        agent_id: str,
        system_prompt: str,
        tools: list[Any],
    ) -> AgentTypeInitializer:
        """
        Create an agent type initializer.

        Args:
            agent_type: Agent type (tool_based, conversational, langgraph, custom)
            agent_id: UUID of the agent
            system_prompt: Base system prompt from database
            tools: List of LangChain tool objects

        Returns:
            Initialized AgentTypeInitializer instance

        Raises:
            ValueError: If agent type is not supported

        Story: 12.8 - Agent Type Implementation
        """
        agent_type_lower = agent_type.lower()

        if agent_type_lower not in cls._initializers:
            logger.warning(
                "Unknown agent type, defaulting to tool_based",
                extra={
                    "requested_type": agent_type,
                    "supported": list(cls._initializers.keys()),
                },
            )
            agent_type_lower = "tool_based"

        initializer_class = cls._initializers[agent_type_lower]
        initializer = initializer_class(
            agent_type=agent_type_lower,
            agent_id=agent_id,
            system_prompt=system_prompt,
            tools=tools,
        )

        logger.debug(
            "Agent type initializer created",
            extra={
                "agent_type": agent_type_lower,
                "initializer_class": initializer_class.__name__,
                "agent_id": str(agent_id),
            },
        )

        return initializer

    @classmethod
    def get_initialization_context(
        cls,
        agent_type: str,
        agent_id: str,
        system_prompt: str,
        tools: list[Any],
    ) -> dict[str, Any]:
        """
        Get agent initialization context for a given type.

        Convenience method that creates initializer and calls initialize().

        Args:
            agent_type: Agent type
            agent_id: Agent UUID
            system_prompt: Base system prompt
            tools: Available tools

        Returns:
            Dictionary with agent initialization context

        Story: 12.8 - Agent Type Implementation
        """
        initializer = cls.create_initializer(
            agent_type=agent_type,
            agent_id=agent_id,
            system_prompt=system_prompt,
            tools=tools,
        )
        return initializer.initialize()

    @classmethod
    def register_initializer(cls, agent_type: str, initializer_class: type) -> None:
        """
        Register a custom agent type initializer.

        Allows extending the factory with custom initializer implementations.

        Args:
            agent_type: Agent type name (e.g., "research_specialist")
            initializer_class: Initializer class inheriting from AgentTypeInitializer

        Raises:
            TypeError: If initializer_class doesn't inherit from AgentTypeInitializer

        Story: 12.8 - Agent Type Implementation
        """
        if not issubclass(initializer_class, AgentTypeInitializer):
            raise TypeError(
                f"Initializer class must inherit from AgentTypeInitializer, "
                f"got {initializer_class}"
            )

        cls._initializers[agent_type.lower()] = initializer_class
        logger.info(
            "Custom agent type initializer registered",
            extra={
                "agent_type": agent_type,
                "initializer_class": initializer_class.__name__,
            },
        )
