'use client';
import { useState, useEffect } from 'react';

// Fetches the current user's permission codes once. If the API doesn't
// exist yet or returns nothing usable, permissions stays null and every
// item is shown (fail-open) so this never breaks a sidebar on its own.
export function useUserPermissions() {
    const [permissions, setPermissions] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/admin/permissions', { cache: 'no-store' })
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (cancelled || !data) return;
                const codes = Array.isArray(data) ? data : (data.codes || data.permissions || null);
                if (Array.isArray(codes)) setPermissions(new Set(codes));
            })
            .catch(() => { /* fail open — leave permissions as null */ });
        return () => { cancelled = true; };
    }, []);

    return permissions;
}

// An item is visible if it has no permissionCode, or permissions haven't
// loaded yet, or the user's set contains that code.
export function canSee(item, permissions) {
    if (!item.permissionCode) return true;
    if (!permissions) return true;
    return permissions.has(item.permissionCode);
}