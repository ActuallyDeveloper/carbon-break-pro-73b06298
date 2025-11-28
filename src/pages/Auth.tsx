import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AnimatedInput } from "@/components/AnimatedInput";
import { useAuthValidation } from "@/hooks/useAuthValidation";
import { useDebounce } from "@/hooks/useDebounce";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  
  const {
    emailError,
    usernameError,
    passwordError,
    emailChecking,
    usernameChecking,
    validateEmail,
    validateUsername,
    validatePassword,
    clearErrors,
  } = useAuthValidation();

  const debouncedEmail = useDebounce(email, 500);
  const debouncedUsername = useDebounce(username, 500);

  useEffect(() => {
    if (user) navigate("/home");
  }, [user, navigate]);

  useEffect(() => {
    if (isSignUp && debouncedEmail) {
      validateEmail(debouncedEmail);
    }
  }, [debouncedEmail, isSignUp]);

  useEffect(() => {
    if (isSignUp && debouncedUsername) {
      validateUsername(debouncedUsername);
    }
  }, [debouncedUsername, isSignUp]);

  useEffect(() => {
    clearErrors();
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Custom validation
    if (isSignUp) {
      const isEmailValid = await validateEmail(email);
      const isUsernameValid = await validateUsername(username);
      const isPasswordValid = validatePassword(password);
      
      if (!isEmailValid || !isUsernameValid || !isPasswordValid) {
        return;
      }
    } else {
      const isEmailValid = email.trim().length > 0;
      const isPasswordValid = password.length > 0;
      
      if (!isEmailValid || !isPasswordValid) {
        toast.error("Please fill in all fields");
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, username);
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-foreground text-background text-3xl font-bold mb-4">
            C
          </div>
          <h1 className="text-4xl font-bold mb-2">Carbon</h1>
          <p className="text-muted-foreground">The modern brick breaker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
          </div>

          {isSignUp && (
            <AnimatedInput
              id="username"
              label="Username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={setUsername}
              error={usernameError}
              checking={usernameChecking}
              success={username.length > 0 && !usernameError}
            />
          )}

          <AnimatedInput
            id="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            error={isSignUp ? emailError : undefined}
            checking={isSignUp ? emailChecking : undefined}
            success={isSignUp ? email.length > 0 && !emailError : undefined}
          />

          <AnimatedInput
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            error={isSignUp ? passwordError : undefined}
            success={isSignUp ? password.length > 0 && !passwordError : undefined}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              isSignUp ? "Create Account" : "Sign In"
            )}
          </Button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
