// Warnings from dependencies that we can't fix and that don't affect the app.
// Must be imported before anything else in the entry file.
const IGNORED_WARNINGS = [
  // NativeWind's runtime (react-native-css-interop) registers className support
  // on every core component, which touches the deprecated ImageBackground getter.
  'ImageBackground is deprecated',
];

if (__DEV__) {
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    const [message] = args;
    if (typeof message === 'string' && IGNORED_WARNINGS.some((text) => message.includes(text))) {
      return;
    }
    warn(...args);
  };
}
