import { z } from "zod";
// E.164 only (+ country code, 8–15 digits); spaces and dashes typed by people are removed first.
export const phoneNumber = z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter your mobile number with country code, for example +923001234567."));
export const smsCode = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the text message.");
