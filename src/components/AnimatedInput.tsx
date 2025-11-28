import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedInputProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  checking?: boolean;
  success?: boolean;
}

export const AnimatedInput = ({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  checking,
  success,
}: AnimatedInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(
            "transition-all duration-300 pr-10",
            error && "border-red-500 focus-visible:ring-red-500",
            success && !error && "border-green-500 focus-visible:ring-green-500"
          )}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {checking && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!checking && error && (
            <AlertCircle className="h-4 w-4 text-red-500 animate-scale-in" />
          )}
          {!checking && !error && success && (
            <CheckCircle className="h-4 w-4 text-green-500 animate-scale-in" />
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 animate-slide-in-left flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};
