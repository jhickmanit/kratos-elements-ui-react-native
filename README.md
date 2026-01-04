# Ory Kratos React Native UI

A React Native (Expo) application demonstrating native UI components for [Ory Kratos](https://www.ory.sh/kratos/) self-service flows. This project provides a reference implementation for integrating Ory authentication into React Native apps using `@ory/client-fetch`.

## Features

- **Native UI Components** - Custom React Native components that render Ory Kratos UI nodes
- **All Self-Service Flows** - Login, Registration, Recovery, Verification, and Settings
- **Cross-Platform** - Works on iOS, Android, and Web (via Expo)
- **NativeWind Styling** - Tailwind CSS-style styling with NativeWind v5
- **Platform-Aware Auth** - Cookie-based auth for web, token-based for native

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (for iOS development) or Android Emulator
- An Ory Network project or self-hosted Ory Kratos instance

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure your Ory backend**

   Copy the example environment file and set your Ory project URL:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` to set your Ory backend:

   ```bash
   # Ory Network
   EXPO_PUBLIC_ORY_PROJECT_URL=https://your-project.projects.oryapis.com

   # Or self-hosted Kratos
   EXPO_PUBLIC_ORY_PROJECT_URL=http://localhost:4433
   ```

3. **Start the development server**

   ```bash
   npx expo start
   ```

   Then press:
   - `w` for web
   - `i` for iOS simulator
   - `a` for Android emulator

## Project Structure

```
├── api/                    # Ory API client and utilities
│   ├── ory.ts             # FrontendApi configuration
│   ├── platform.ts        # Platform detection (web/native)
│   ├── session.ts         # Session token storage
│   ├── errors.ts          # Error handling utilities
│   └── utils.ts           # Helper functions
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with AuthProvider
│   ├── index.tsx          # Home screen
│   └── (auth)/            # Auth flow screens
│       ├── login.tsx
│       ├── registration.tsx
│       ├── recovery.tsx
│       ├── verification.tsx
│       └── settings.tsx
├── components/             # Reusable UI components
│   ├── OryFlow.tsx        # Main flow renderer
│   ├── NodeDispatcher.tsx # Node type router
│   ├── NodeInput.tsx      # Input/button renderer
│   └── AuthCard.tsx       # Card layout wrapper
├── context/
│   └── AuthContext.tsx    # Authentication state management
├── hooks/
│   └── useOryFlow.ts      # Flow management hook
└── .docker/               # Local Kratos development setup
    ├── docker-compose.yml
    └── kratos/
        ├── kratos.yml
        └── identity.schema.json
```

## Local Development with Kratos

A Docker Compose setup is included for local development:

```bash
cd .docker
docker compose up -d
```

This starts:
- **Kratos** on `http://localhost:4433` (public) and `http://localhost:4434` (admin)
- **MailSlurper** on `http://localhost:4436` (SMTP) and `http://localhost:4437` (UI)

Update your `.env`:

```bash
EXPO_PUBLIC_ORY_PROJECT_URL=http://localhost:4433
```

> **Note:** For iOS/Android simulators, use your machine's IP address instead of `localhost`.

## Architecture

### Platform-Aware Authentication

The app handles authentication differently based on platform:

| Platform | Auth Method | Session Storage |
|----------|-------------|-----------------|
| Web | Cookies | Browser cookies |
| iOS/Android | Session Token | Expo SecureStore |

### UI Node Rendering

Ory Kratos returns UI nodes that describe form fields. This app renders them natively:

- `input` → `TextInput` or `TouchableOpacity` (for buttons)
- `text` → `Text`
- `img` → `Image` (for QR codes in MFA)
- `a` → Touchable link

### Flow Management

The `useOryFlow` hook abstracts common flow operations:

```typescript
const { flow, isSubmitting, submit } = useOryFlow<LoginFlow>("login");

const onSubmit = async (values) => {
  const response = await submit(values);
  if (response?.session) {
    // Handle successful login
  }
};
```

## Customization

### Styling

This project uses [NativeWind](https://www.nativewind.dev/) v5 with Tailwind CSS v4. Customize the theme in `global.css`:

```css
@theme {
  --color-ui-900: #0f172a;
  --color-ui-danger: #dc2626;
  --radius-buttons: 0.25rem;
}
```

### Identity Schema

When using local Kratos, modify the identity schema in `.docker/kratos/identity.schema.json` to add custom fields.

## Troubleshooting

### iOS Simulator: Network Issues

If the iOS simulator can't reach your local Kratos:
1. Use your machine's IP address instead of `localhost`
2. Ensure Kratos binds to `0.0.0.0` (see `.docker/kratos/kratos.yml`)

### Web: CSRF Errors

CSRF errors typically occur when:
- The cookie domain doesn't match the app origin
- The flow has expired

The app automatically recreates flows on CSRF errors.

### NativeWind: Styles Not Applying

Run `npx expo start --clear` to clear the Metro bundler cache.

## License

MIT
