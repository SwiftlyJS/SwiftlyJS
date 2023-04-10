import { useState } from "react";
import { serializeForm } from "./util";
import { useSubjectValue } from "./hooks"
import { BehaviorSubject } from "rxjs"

export interface FormProps {
  successMessage?: React.ReactNode;
  children: React.ReactNode;
  onSendStart?: () => void;
  onSendEnd?: () => void;
}

type FormErrors = Record<string, string>;

declare global {
  var __noscript_form_errors: BehaviorSubject<FormErrors>;
}

export const errorsSubject = new BehaviorSubject<FormErrors>({});

export function setFormErrors(newErrors: FormErrors): void {
  errorsSubject.next(newErrors);
}

export function useFieldError(fieldName: string): string | null {
  const errors = useSubjectValue(errorsSubject);
  return errors[fieldName] ?? null;
}

export const genericErrorSubject = new BehaviorSubject<string | null>(null);

export function setGenericError(message: string): void {
  genericErrorSubject.next(message);
}

export interface GenericErrorProps { }

export const GenericError = (_props: GenericErrorProps) => {
  return useSubjectValue(genericErrorSubject);
}

export const Form = ({
  successMessage,
  children,
  onSendStart,
  onSendEnd,
}: FormProps) => {
  const [success, setSuccess] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSendStart !== undefined) {
      onSendStart();
    }
    const data = serializeForm(e.currentTarget);
    const response = await fetch(new URL(location.pathname, location.href).href, {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: new URLSearchParams(data as Record<string, string>).toString()
    });
    if (response.status === 400) {
      const body = await response.json();
      if (body.message) {
        setGenericError(body.message);
      }
      setFormErrors(body.errors);
    } else if (response.status === 200) {
      setFormErrors({});
      setSuccess(true);
    }
    if (onSendEnd !== undefined) {
      onSendEnd();
    }
  }
  if (success) {
    return successMessage;
  }
  return (
    <form onSubmit={onSubmit}>
      {children}
    </form>
  );
}


