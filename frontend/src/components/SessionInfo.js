import React from 'react';

export function getSession() {
  const token = localStorage.getItem('accessToken');
  if (!token) return { token: null };
  try {
    // Payload is not trusted for security; only for UI.
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return {
      token,
      role: payload?.role,
      userId: payload?.userId,
      companyId: payload?.companyId
    };
  } catch {
    return { token };
  }
}

