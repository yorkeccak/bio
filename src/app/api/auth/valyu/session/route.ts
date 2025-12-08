import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Create a local Supabase session from Valyu OAuth tokens
 * This endpoint:
 * 1. Fetches user info from Valyu Platform
 * 2. Creates or updates user in app's Supabase (user_metadata only, no valyu columns in users table)
 * 3. Generates a magic link token for local session
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_token, id_token } = body;

    if (!access_token) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Missing access_token' },
        { status: 400 }
      );
    }

    // Get user info from Valyu Platform
    const valyuAppUrl = process.env.VALYU_APP_URL || 'https://platform.valyu.ai';
    const userInfoUrl = `${valyuAppUrl}/api/oauth/userinfo`;

    console.log('[Session] Fetching user info from Valyu Platform');

    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Session] Failed to get user info:', userInfoResponse.status);
      return NextResponse.json(
        { error: 'userinfo_failed', message: 'Failed to get user information' },
        { status: 401 }
      );
    }

    const userInfo = await userInfoResponse.json();
    console.log('[Session] Got user info:', {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Create Supabase admin client for app's database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Session] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'server_error', message: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if auth user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === userInfo.email);

    let userId: string;

    if (existingUser) {
      // User exists - update metadata
      userId = existingUser.id;
      console.log('[Session] Found existing user:', userId);

      // Update user_metadata with Valyu info (not the users table)
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          valyu_sub: userInfo.sub,
          full_name: userInfo.name || userInfo.given_name,
          avatar_url: userInfo.picture,
          valyu_user_type: userInfo.valyu_user_type,
          valyu_organisation_id: userInfo.valyu_organisation_id,
          valyu_organisation_name: userInfo.valyu_organisation_name,
        },
      });

      // Update users table with basic info only (no valyu-specific columns)
      await supabase
        .from('users')
        .upsert({
          id: userId,
          email: userInfo.email,
          full_name: userInfo.name || userInfo.given_name,
          avatar_url: userInfo.picture,
          subscription_tier: 'valyu',
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
    } else {
      // Create new user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userInfo.email,
        email_confirm: true, // Mark as verified since Valyu verified it
        user_metadata: {
          valyu_sub: userInfo.sub,
          full_name: userInfo.name || userInfo.given_name,
          avatar_url: userInfo.picture,
          valyu_user_type: userInfo.valyu_user_type,
          valyu_organisation_id: userInfo.valyu_organisation_id,
          valyu_organisation_name: userInfo.valyu_organisation_name,
        },
      });

      if (authError) {
        console.error('[Session] Failed to create auth user:', authError);
        return NextResponse.json(
          { error: 'user_creation_failed', message: 'Failed to create user' },
          { status: 500 }
        );
      }

      userId = authUser.user.id;
      console.log('[Session] Created new user:', userId);

      // Create user profile in users table with basic info only
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userInfo.email,
          full_name: userInfo.name || userInfo.given_name,
          avatar_url: userInfo.picture,
          subscription_tier: 'valyu',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('[Session] Failed to create user profile:', profileError);
        // Continue anyway - user can still sign in
      }
    }

    // Generate magic link for local session
    console.log('[Session] Generating magic link for user:', userId);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userInfo.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`,
      },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[Session] Failed to generate magic link:', linkError);
      return NextResponse.json(
        { error: 'session_creation_failed', message: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Return the magic link token and user info
    // Valyu info is in user_metadata, accessible via session.user.user_metadata
    return NextResponse.json({
      success: true,
      is_new_user: !existingUser,
      user: {
        id: userId,
        email: userInfo.email,
        valyu_sub: userInfo.sub,
        valyu_organisation_name: userInfo.organisation_name,
      },
      magic_link_token: linkData.properties.hashed_token,
      magic_link_url: linkData.properties.action_link,
    });
  } catch (error) {
    console.error('[Session] Error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
