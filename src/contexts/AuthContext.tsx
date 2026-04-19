import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDocFromServer, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserProfileData {
  firstName: string;
  lastName: string;
  address?: string;
  phone?: string;
  tier?: 'free' | 'plus' | 'pro';
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, pass: string, profile: UserProfileData) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Validate connection to Firestore as per requirements
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    let unsubProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (profileDoc) => {
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfileData);
          } else {
            setUserProfile({ firstName: currentUser.displayName?.split(' ')[0] || '', lastName: '', tier: 'free' });
          }
          setLoading(false);
        }, (error) => {
          console.error("Could not fetch user profile", error);
          setUserProfile({ firstName: '', lastName: '', tier: 'free' });
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = undefined;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Required scope for reading and creating events from Google Calendar
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, profile: UserProfileData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: `${profile.firstName} ${profile.lastName}`.trim()
      });

      // Save additional info to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address || '',
        phone: profile.phone || '',
        tier: 'free',
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error registering with email', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error logging in with email', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setGoogleAccessToken(null);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, googleAccessToken, signInWithGoogle, registerWithEmail, loginWithEmail, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
