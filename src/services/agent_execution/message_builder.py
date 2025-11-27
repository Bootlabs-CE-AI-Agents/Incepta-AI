"""
Message Construction for Agent Execution

Builds LangChain message lists with system prompt + user message.
Performs variable substitution in system prompts using context dictionaries.

Pattern: Simple utility function with clear single responsibility.
No state management, pure functional approach.

References:
- LangChain Message types (SystemMessage, HumanMessage)
- Story 12.7: File Size Refactoring (extracted from agent_execution_service.py)

Usage:
    messages = build_messages(
        system_prompt="You are a {role} assistant",
        user_message="Help me with...",
        context={"role": "technical support"}
    )
    # Returns: [SystemMessage(...), HumanMessage(...)]
"""

import logging
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


def augment_system_prompt_for_tools(
    system_prompt: str,
    tools: List[BaseTool],
) -> str:
    """
    Augment system prompt with explicit tool usage guidance.

    Based on research finding that explicit tool usage encouragement
    significantly improves LLM tool calling behavior (Story 12.9).

    This addresses common LLM failure modes:
    - Ignoring available tools
    - Not recognizing when to use tools
    - Using tools incorrectly

    Args:
        system_prompt: Original agent system prompt
        tools: List of available tools

    Returns:
        Enhanced system prompt with tool usage guidance

    Reason: Research shows that LLMs respond better to explicit tool usage
    guidance rather than generic encouragement. Without explicit instruction,
    models may ignore available tools or use them incorrectly.
    """
    if not tools:
        return system_prompt

    tool_descriptions = "\n".join(
        f"- {tool.name}: {tool.description or 'No description available'}"
        for tool in tools
    )

    tool_guidance = f"""

## Available Tools
You have access to the following tools to complete tasks:
{tool_descriptions}

## Tool Usage Instructions
1. **Analyze the request** to determine which tools are needed
2. **Use tools proactively** - don't hesitate to call tools when they can help
3. **Combine tool results** - use multiple tools in sequence if needed
4. **Verify results** - check tool outputs for correctness before proceeding
5. **Handle errors gracefully** - if a tool fails, try alternative approaches

IMPORTANT: Prefer using available tools over manual reasoning when tools can provide accurate information. Tools are reliable and should be your first choice for data retrieval and actions."""

    return system_prompt + tool_guidance


def build_messages(
    system_prompt: str,
    user_message: str,
    context: Optional[Dict[str, Any]] = None,
    tools: Optional[List[BaseTool]] = None,
) -> List[Any]:
    """
    Build LangChain messages list with system prompt + user message.

    Performs variable substitution in system_prompt using context dict.
    If substitution fails due to missing keys, logs warning and uses
    original prompt without substitution (graceful degradation).

    Optionally augments system prompt with explicit tool usage guidance
    to improve LLM tool calling behavior (Story 12.9).

    Args:
        system_prompt: Agent's system prompt (may contain {variables})
        user_message: User's input message
        context: Optional context dict for variable substitution
        tools: Optional list of tools to augment prompt with usage guidance

    Returns:
        List of LangChain Message objects [SystemMessage, HumanMessage]

    Example:
        >>> messages = build_messages(
        >>>     system_prompt="You are {role} assistant for {company}",
        >>>     user_message="Help me debug this code",
        >>>     context={"role": "technical support", "company": "ACME Corp"},
        >>>     tools=[github_tool, slack_tool]
        >>> )
        >>> # SystemMessage includes tool usage guidance
        >>> # HumanMessage: "Help me debug this code"
    """
    # Perform variable substitution in system prompt
    if context:
        try:
            formatted_prompt = system_prompt.format(**context)
        except KeyError as e:
            logger.warning(
                f"Missing context variable in system prompt: {e}",
                extra={"missing_key": str(e)},
            )
            # Graceful degradation: use original prompt
            formatted_prompt = system_prompt
    else:
        formatted_prompt = system_prompt

    # Augment with tool usage guidance if tools provided (Story 12.9)
    if tools:
        formatted_prompt = augment_system_prompt_for_tools(formatted_prompt, tools)
        logger.debug(
            "System prompt augmented with tool usage guidance",
            extra={"tool_count": len(tools)},
        )

    # Build messages list
    messages = [
        SystemMessage(content=formatted_prompt),
        HumanMessage(content=user_message),
    ]

    return messages
