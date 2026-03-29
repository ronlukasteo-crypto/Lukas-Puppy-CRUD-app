import React from 'react';
import { useAsgardeo } from '@asgardeo/react';
import './Header.css';

const Header = () => {
  const { isSignedIn, isLoading, signIn, signOut, user } = useAsgardeo();

  return (
    <header className="site-header">
      <div className="site-header__inner site-header__row">
        <h1 className="site-header__title">Puppy Registry</h1>
        <div className="site-header__auth">
          {isLoading ? (
            <span className="site-header__note">...</span>
          ) : isSignedIn ? (
            <>
              <span className="site-header__user">
                {user?.displayName ?? user?.username ?? user?.email ?? ''}
              </span>
              <button type="button" className="btn btn--header btn--ghost" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--header btn--accent" onClick={() => signIn()}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
