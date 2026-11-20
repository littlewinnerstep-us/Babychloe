import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://qrjjskqozjumrgvakle.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TuW4rCNljJ4sCgg_GjsHZw_58xjY3lI';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function mapSupabaseUserToLocal(authUser, profile = null) {
  const meta = authUser?.user_metadata || {};
  const username =
    profile?.username ||
    meta.username ||
    (authUser?.email ? authUser.email.split('@')[0] : 'visitor');
  const usernameLower = (profile?.username_lower || username).toLowerCase();
  return {
    id: authUser.id,
    supabaseId: authUser.id,
    username,
    usernameLower,
    email: profile?.email || authUser.email || '',
    name: profile?.name || meta.name || username,
    gender: (profile?.gender || meta.gender) === 'boy' ? 'boy' : 'girl',
    role: profile?.role || meta.role || 'visitor',
    avatar: profile?.avatar || meta.avatar || null,
    moderation: profile?.moderation || {},
    updatedAt: Date.now(),
  };
}

export async function fetchProfileById(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

export async function supabaseSignUp({ email, password, username, name, gender = 'girl', avatar = null }) {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUser = String(username || '').trim();
  const cleanLower = cleanUser.toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: 'Please enter a valid email address (used for password reset).' };
  }
  if (!password || String(password).length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  try {
    // Check if username already exists in Supabase profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username_lower', cleanLower)
      .maybeSingle();
    if (existingUser) {
      return { ok: false, error: `Username "${cleanUser}" is already taken.` };
    }

    const redirectTo =
      typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: String(password),
      options: {
        emailRedirectTo: redirectTo,
        data: {
          username: cleanUser,
          username_lower: cleanLower,
          name,
          gender,
          avatar,
        },
      },
    });

    if (error) {
      return { ok: false, error: error.message || 'Could not create account.' };
    }

    const authUser = data?.user;
    if (authUser && data?.session) {
      await supabase.from('profiles').upsert({
        id: authUser.id,
        username: cleanUser,
        username_lower: cleanLower,
        email: cleanEmail,
        name,
        gender,
        role: 'visitor',
        avatar: avatar || {},
        updated_at: new Date().toISOString(),
      });
    }

    const mapped = authUser ? mapSupabaseUserToLocal(authUser) : null;
    return {
      ok: true,
      user: mapped,
      needsEmailConfirm: Boolean(authUser && !data?.session),
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error while creating account.' };
  }
}

export async function supabaseSignIn({ identifier, password }) {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const raw = String(identifier || '').trim();
  if (!raw || !password) {
    return { ok: false, error: 'Please enter both username/email and password.' };
  }

  try {
    let loginEmail = raw.includes('@') ? raw.toLowerCase() : '';
    let resolvedProfile = null;

    if (!loginEmail) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('username_lower', raw.toLowerCase())
        .maybeSingle();
      if (!prof?.email) {
        return { ok: false, notFoundInSupabase: true, error: 'Account not found in Supabase.' };
      }
      loginEmail = prof.email;
      resolvedProfile = prof;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: String(password),
    });

    if (error) {
      return { ok: false, error: error.message || 'Invalid login credentials.' };
    }

    const authUser = data?.user;
    if (!resolvedProfile && authUser?.id) {
      resolvedProfile = await fetchProfileById(authUser.id);
      if (!resolvedProfile && authUser) {
        const meta = authUser.user_metadata || {};
        if (meta.username) {
          await supabase.from('profiles').upsert({
            id: authUser.id,
            username: meta.username,
            username_lower: (meta.username_lower || meta.username).toLowerCase(),
            email: authUser.email,
            name: meta.name || meta.username,
            gender: meta.gender || 'girl',
            role: 'visitor',
            avatar: meta.avatar || {},
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    return {
      ok: true,
      user: mapSupabaseUserToLocal(authUser, resolvedProfile),
    };
  } catch (err) {
    return { ok: false, networkError: true, error: err?.message || 'Unable to reach Supabase.' };
  }
}

export async function supabaseSendPasswordReset(email) {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  try {
    const redirectTo =
      typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://littlewinnerstep-us.github.io/Babychloe/';

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });
    if (error) {
      return { ok: false, error: error.message || 'Could not send reset email.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error sending reset email.' };
  }
}

export async function supabaseUpdatePassword(newPassword) {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  if (!newPassword || String(newPassword).length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: String(newPassword),
    });
    if (error) {
      return { ok: false, error: error.message || 'Could not update password.' };
    }
    const profile = data?.user?.id ? await fetchProfileById(data.user.id) : null;
    return {
      ok: true,
      user: data?.user ? mapSupabaseUserToLocal(data.user, profile) : null,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error updating password.' };
  }
}

export async function supabaseSignOut() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

export async function supabaseSyncMemorial(memorial) {
  if (!supabase || !memorial?.id || memorial.visibility === 'private') return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    await supabase.from('memorials').upsert({
      id: memorial.id,
      owner_id: sessionData.session.user.id,
      owner_username: memorial.ownerUsername || '',
      owner_name: memorial.ownerName || '',
      species: memorial.species || 'Dog',
      space: memorial.space === 'ash-room' ? 'ash-room' : 'tombstone',
      location_code: memorial.locationCode || 'Plot G-21',
      admin_managed: Boolean(memorial.adminManaged),
      deleted_at: memorial.deletedAt ? new Date(memorial.deletedAt).toISOString() : null,
      payload: memorial,
      updated_at: new Date(memorial.updatedAt || Date.now()).toISOString(),
    });
  } catch {
    // ignore transient Supabase table/offline errors
  }
}

export async function supabaseFetchMemorials() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('memorials')
      .select('payload')
      .limit(500);
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => row.payload).filter((p) => p && p.id);
  } catch {
    return [];
  }
}
