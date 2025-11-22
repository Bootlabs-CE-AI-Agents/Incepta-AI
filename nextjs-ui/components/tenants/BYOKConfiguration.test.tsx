/**
 * BYOKConfiguration Component Tests
 *
 * Tests for BYOK (Bring Your Own Keys) configuration component.
 * Covers: mode toggle, key input, validation, test keys, enable BYOK, platform keys.
 *
 * Story 1: P1-1 BYOK Configuration UI
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BYOKConfiguration } from './BYOKConfiguration';
import * as tenantsApi from '@/lib/api/tenants';
import { toast } from 'sonner';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock tenants API
jest.mock('@/lib/api/tenants', () => ({
  testBYOKKeys: jest.fn(),
  enableBYOK: jest.fn(),
  initializePlatformKeys: jest.fn(),
}));

const mockTestBYOKKeys = tenantsApi.testBYOKKeys as jest.MockedFunction<typeof tenantsApi.testBYOKKeys>;
const mockEnableBYOK = tenantsApi.enableBYOK as jest.MockedFunction<typeof tenantsApi.enableBYOK>;
const mockInitializePlatformKeys = tenantsApi.initializePlatformKeys as jest.MockedFunction<typeof tenantsApi.initializePlatformKeys>;

// Mock data
const mockValidationResponse = {
  openai: {
    valid: true,
    models: ['gpt-4', 'gpt-3.5-turbo'],
    error: null,
  },
  anthropic: {
    valid: true,
    models: ['claude-3-opus', 'claude-3-sonnet'],
    error: null,
  },
};

const mockEnableResponse = {
  success: true,
  providers_configured: ['openai', 'anthropic'],
};

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('BYOKConfiguration', () => {
  const defaultProps = {
    tenantId: 'tenant-123',
    hasVirtualKey: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render mode selection radio buttons', () => {
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/Platform keys/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bring Your Own Keys/i)).toBeInTheDocument();
    });

    it('should default to platform mode', () => {
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const platformRadio = screen.getByLabelText(/Platform keys/i);
      expect(platformRadio).toBeChecked();
    });

    it('should show platform keys description when in platform mode', () => {
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Use platform-managed API keys/i)).toBeInTheDocument();
    });
  });

  describe('Mode Toggle', () => {
    it('should switch to BYOK mode when BYOK radio selected', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      expect(byokRadio).toBeChecked();
    });

    it('should show API key inputs when in BYOK mode', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sk-/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/sk-ant-/i)).toBeInTheDocument();
      });
    });
  });

  describe('Key Input', () => {
    it('should accept OpenAI key input', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      expect(openaiInput).toHaveValue('sk-test-key-12345');
    });

    it('should accept Anthropic key input', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const anthropicInput = screen.getByPlaceholderText(/sk-ant-/i);
      await user.type(anthropicInput, 'sk-ant-test-key-67890');

      expect(anthropicInput).toHaveValue('sk-ant-test-key-67890');
    });
  });

  describe('Key Validation', () => {
    it('should show error if OpenAI key does not start with sk-', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'invalid-key');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('OpenAI key must start with "sk-"');
      });
    });

    it('should show error if Anthropic key does not start with sk-ant-', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const anthropicInput = screen.getByPlaceholderText(/sk-ant-/i);
      await user.type(anthropicInput, 'invalid-key');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Anthropic key must start with "sk-ant-"');
      });
    });

    it('should show error if no keys provided', async () => {
      const user = userEvent.setup();
      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Provide at least one API key');
      });
    });
  });

  describe('Test Keys', () => {
    it('should call testBYOKKeys API with valid OpenAI key', async () => {
      const user = userEvent.setup();
      mockTestBYOKKeys.mockResolvedValue(mockValidationResponse);

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        expect(mockTestBYOKKeys).toHaveBeenCalledWith(defaultProps.tenantId, {
          openai_key: 'sk-test-key-12345',
        });
      });
    });

    it('should show success toast when keys are valid', async () => {
      const user = userEvent.setup();
      mockTestBYOKKeys.mockResolvedValue(mockValidationResponse);

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Keys validated successfully');
      });
    });

    it('should show error toast when key validation fails', async () => {
      const user = userEvent.setup();
      mockTestBYOKKeys.mockRejectedValue(new Error('Invalid API key'));

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to test keys', {
          description: 'Invalid API key',
        });
      });
    });
  });

  describe('Enable BYOK', () => {
    it('should enable Save button after successful validation', async () => {
      const user = userEvent.setup();
      mockTestBYOKKeys.mockResolvedValue(mockValidationResponse);

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        const saveButton = screen.getByText(/Save BYOK/i);
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should call enableBYOK API when Save button clicked', async () => {
      const user = userEvent.setup();
      mockTestBYOKKeys.mockResolvedValue(mockValidationResponse);
      mockEnableBYOK.mockResolvedValue(mockEnableResponse);

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        const saveButton = screen.getByText(/Save BYOK/i);
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText(/Save BYOK/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockEnableBYOK).toHaveBeenCalledWith(defaultProps.tenantId, {
          openai_key: 'sk-test-key-12345',
        });
      });
    });

    it('should show success toast when BYOK enabled', async () => {
      const user = userEvent.setup();
      mockTestBYOKKeys.mockResolvedValue(mockValidationResponse);
      mockEnableBYOK.mockResolvedValue(mockEnableResponse);

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const byokRadio = screen.getByLabelText(/Bring Your Own Keys/i);
      await user.click(byokRadio);

      const openaiInput = screen.getByPlaceholderText(/sk-/i);
      await user.type(openaiInput, 'sk-test-key-12345');

      const testButton = screen.getByText(/Test Keys/i);
      await user.click(testButton);

      await waitFor(() => {
        const saveButton = screen.getByText(/Save BYOK/i);
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText(/Save BYOK/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('BYOK enabled successfully', {
          description: 'Configured providers: openai, anthropic',
        });
      });
    });
  });

  describe('Platform Keys', () => {
    it('should call initializePlatformKeys when Initialize button clicked', async () => {
      const user = userEvent.setup();
      mockInitializePlatformKeys.mockResolvedValue({ success: true });

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const initButton = screen.getByText(/Initialize Platform Keys/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(mockInitializePlatformKeys).toHaveBeenCalledWith(defaultProps.tenantId);
      });
    });

    it('should show success toast when platform keys initialized', async () => {
      const user = userEvent.setup();
      mockInitializePlatformKeys.mockResolvedValue({ success: true });

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const initButton = screen.getByText(/Initialize Platform Keys/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Platform keys initialized successfully');
      });
    });

    it('should show error toast when platform keys initialization fails', async () => {
      const user = userEvent.setup();
      mockInitializePlatformKeys.mockRejectedValue(new Error('Initialization failed'));

      render(<BYOKConfiguration {...defaultProps} />, { wrapper: createWrapper() });

      const initButton = screen.getByText(/Initialize Platform Keys/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to initialize platform keys', {
          description: 'Initialization failed',
        });
      });
    });
  });
});
