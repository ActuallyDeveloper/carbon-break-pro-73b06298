import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export const useAuthValidation = () => {
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const emailSchema = z.string().trim().email();
  const usernameSchema = z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/);
  const passwordSchema = z.string().min(6).max(100);

  const validateEmail = async (email: string): Promise<boolean> => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }

    try {
      emailSchema.parse(email);
    } catch {
      setEmailError('Invalid email format');
      return false;
    }

    setEmailError('');
    return true;
  };

  const validateUsername = async (username: string): Promise<boolean> => {
    if (!username) {
      setUsernameError('Username is required');
      return false;
    }

    try {
      usernameSchema.parse(username);
    } catch {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscore only)');
      return false;
    }

    setUsernameChecking(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (data) {
        setUsernameError('Username already taken');
        return false;
      }
    } catch {
      // If we can't check, assume it's available
    } finally {
      setUsernameChecking(false);
    }

    setUsernameError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }

    try {
      passwordSchema.parse(password);
    } catch {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const clearErrors = () => {
    setEmailError('');
    setUsernameError('');
    setPasswordError('');
  };

  return {
    emailError,
    usernameError,
    passwordError,
    emailChecking,
    usernameChecking,
    validateEmail,
    validateUsername,
    validatePassword,
    clearErrors,
  };
};
