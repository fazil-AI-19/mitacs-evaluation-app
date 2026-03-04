import client from './client';
import type { TokenResponse, User } from '../types';

export async function register(
  email: string,
  fullName: string,
  password: string
): Promise<User> {
  const res = await client.post<User>('/auth/register', {
    email,
    full_name: fullName,
    password,
  });
  return res.data;
}

export async function login(email: string, password: string): Promise<string> {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await client.post<TokenResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data.access_token;
}

export async function getMe(): Promise<User> {
  const res = await client.get<User>('/auth/me');
  return res.data;
}
