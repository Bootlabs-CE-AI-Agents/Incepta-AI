import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportConfig } from '../ImportConfig';

describe('ImportConfig', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('renders name prefix and base URL fields', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/Tool Name Prefix/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Base URL/i)).toBeInTheDocument();
    });

    it('renders authentication type dropdown', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/Authentication Type/i)).toBeInTheDocument();
    });

    it('renders "Import Tools" button', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /Import Tools/i })).toBeInTheDocument();
    });
  });

  describe('Auth Type Dropdown', () => {
    it('includes OAuth2 option in dropdown', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);

      expect(options).toContain('oauth2');
    });

    it('defaults to "none" auth type', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i) as HTMLSelectElement;
      expect(select.value).toBe('none');
    });
  });

  describe('OAuth2 Fields', () => {
    it('shows OAuth2 configuration when oauth2 is selected', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      expect(screen.getByLabelText(/Client ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Client Secret/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Authorization URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Token URL/i)).toBeInTheDocument();
      expect(screen.getByText(/Scopes.*Select at least 1/i)).toBeInTheDocument();
    });

    it('hides OAuth2 fields when other auth type is selected', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      expect(screen.getByLabelText(/Client ID/i)).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'none' } });

      expect(screen.queryByLabelText(/Client ID/i)).not.toBeInTheDocument();
    });

    it('client secret field has password type', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      const input = screen.getByLabelText(/Client Secret/i) as HTMLInputElement;
      expect(input.type).toBe('password');
    });
  });

  describe('OAuth2 Form Validation', () => {
    it('requires base URL', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      // Fill OAuth2 fields but leave base URL empty
      fireEvent.change(screen.getByLabelText(/Client ID/i), { target: { value: 'test-client-id' } });
      fireEvent.change(screen.getByLabelText(/Client Secret/i), { target: { value: 'test-secret' } });
      fireEvent.change(screen.getByLabelText(/Authorization URL/i), { target: { value: 'https://auth.example.com' } });
      fireEvent.change(screen.getByLabelText(/Token URL/i), { target: { value: 'https://token.example.com' } });

      // Attempt submit
      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('validates at least 1 scope is selected', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      // Fill all OAuth2 fields
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Client ID/i), { target: { value: 'test-client-id' } });
      fireEvent.change(screen.getByLabelText(/Client Secret/i), { target: { value: 'test-secret' } });
      fireEvent.change(screen.getByLabelText(/Authorization URL/i), { target: { value: 'https://auth.example.com' } });
      fireEvent.change(screen.getByLabelText(/Token URL/i), { target: { value: 'https://token.example.com' } });

      // Submit without selecting any scopes
      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(screen.getByText(/At least 1 scope must be selected/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('OAuth2 Form Submission', () => {
    it('submits OAuth2 auth config with valid data', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      // Fill all OAuth2 fields
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Client ID/i), { target: { value: 'test-client-id' } });
      fireEvent.change(screen.getByLabelText(/Client Secret/i), { target: { value: 'test-secret' } });
      fireEvent.change(screen.getByLabelText(/Authorization URL/i), { target: { value: 'https://auth.example.com' } });
      fireEvent.change(screen.getByLabelText(/Token URL/i), { target: { value: 'https://token.example.com' } });

      // Select a scope
      const scopeCheckbox = screen.getByLabelText(/Select read:user scope/i);
      fireEvent.click(scopeCheckbox);

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          namePrefix: undefined,
          baseUrl: 'https://api.example.com',
          authConfig: {
            type: 'oauth2',
            oauth2_client_id: 'test-client-id',
            oauth2_client_secret: 'test-secret',
            oauth2_auth_url: 'https://auth.example.com',
            oauth2_token_url: 'https://token.example.com',
            oauth2_scopes: ['read:user'],
          },
        });
      });
    });

    it('submits with multiple scopes selected', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      // Fill OAuth2 fields
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Client ID/i), { target: { value: 'test-client-id' } });
      fireEvent.change(screen.getByLabelText(/Client Secret/i), { target: { value: 'test-secret' } });
      fireEvent.change(screen.getByLabelText(/Authorization URL/i), { target: { value: 'https://auth.example.com' } });
      fireEvent.change(screen.getByLabelText(/Token URL/i), { target: { value: 'https://token.example.com' } });

      // Select multiple scopes
      fireEvent.click(screen.getByLabelText(/Select read:user scope/i));
      fireEvent.click(screen.getByLabelText(/Select write:repo scope/i));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            authConfig: expect.objectContaining({
              type: 'oauth2',
              oauth2_scopes: expect.arrayContaining(['read:user', 'write:repo']),
            }),
          })
        );
      });
    });

    it('includes name prefix when provided', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      // Fill fields including name prefix
      fireEvent.change(screen.getByLabelText(/Tool Name Prefix/i), { target: { value: 'github_' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Client ID/i), { target: { value: 'test-client-id' } });
      fireEvent.change(screen.getByLabelText(/Client Secret/i), { target: { value: 'test-secret' } });
      fireEvent.change(screen.getByLabelText(/Authorization URL/i), { target: { value: 'https://auth.example.com' } });
      fireEvent.change(screen.getByLabelText(/Token URL/i), { target: { value: 'https://token.example.com' } });
      fireEvent.click(screen.getByLabelText(/Select read:user scope/i));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            namePrefix: 'github_',
          })
        );
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('submits "none" auth config correctly', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          namePrefix: undefined,
          baseUrl: 'https://api.example.com',
          authConfig: {
            type: 'none',
          },
        });
      });
    });

    it('submits "api_key" auth config correctly', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'api_key' } });

      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/API Key Value/i), { target: { value: 'test-key-123' } });

      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            authConfig: expect.objectContaining({
              type: 'api_key',
              api_key_value: 'test-key-123',
            }),
          })
        );
      });
    });

    it('submits "bearer" auth config correctly', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });

      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'bearer-token-123' } });

      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            authConfig: expect.objectContaining({
              type: 'bearer',
              bearer_token: 'bearer-token-123',
            }),
          })
        );
      });
    });

    it('submits "basic" auth config correctly', async () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'basic' } });

      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'testpass' } });

      fireEvent.click(screen.getByRole('button', { name: /Import Tools/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            authConfig: expect.objectContaining({
              type: 'basic',
              basic_username: 'testuser',
              basic_password: 'testpass',
            }),
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('disables inputs when isLoading is true', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByLabelText(/Base URL/i)).toBeDisabled();
      expect(screen.getByLabelText(/Authentication Type/i)).toBeDisabled();
    });

    it('shows "Importing..." text on button when loading', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByRole('button', { name: /Importing.../i })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} isLoading={true} />);

      const button = screen.getByRole('button', { name: /Importing.../i }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });

  describe('Responsive Layout', () => {
    it('applies responsive grid classes to Client ID/Secret fields', () => {
      render(<ImportConfig onSubmit={mockOnSubmit} />);

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      const clientIdDiv = screen.getByLabelText(/Client ID/i).closest('div');
      const gridContainer = clientIdDiv?.parentElement;

      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-3');
    });
  });
});
