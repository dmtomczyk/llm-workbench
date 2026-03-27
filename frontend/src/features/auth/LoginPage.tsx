import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../auth';

function authErrorMessage(code: string): string {
  if (code === 'callback') return 'The sign-in callback did not complete successfully. Try again, and check your OIDC redirect URL if the problem persists.';
  if (code === 'required') return 'You need to sign in before using BRIDGE.';
  if (code === 'misconfigured') return 'Authentication is enabled, but the SSO configuration appears incomplete. Review the Authentication / SSO settings.';
  return 'Sign in with your organization’s single sign-on provider to access BRIDGE.';
}

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const nextPath = params.get('next') || '/';
  const errorCode = params.get('error') || '';

  if (auth.loading) {
    return <div className="card stack"><h2>Checking sign-in…</h2></div>;
  }
  if (auth.config && !auth.config.enabled) {
    return <Navigate to="/" replace />;
  }
  if (auth.user) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="login-shell">
      <div className="card stack login-card">
        <div>
          <h2>Login to BRIDGE</h2>
          <p className="muted">{authErrorMessage(errorCode)}</p>
        </div>
        {errorCode ? <div className="notice error">Auth status: {errorCode}</div> : null}
        <button type="button" onClick={() => auth.beginLogin(nextPath)}>Continue with SSO</button>
        {auth.config?.local_dev_bypass ? (
          <button type="button" onClick={() => auth.beginDevBypass(nextPath)}>Local dev bypass</button>
        ) : null}
        <div className="muted">After login, BRIDGE will return you to <code>{nextPath}</code>.</div>
      </div>
    </div>
  );
}
