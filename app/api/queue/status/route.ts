/**
 * 🎯 Queue Status API - Controlla posizione in coda
 * 
 * GET /api/queue/status?userId=xxx
 * 
 * Ritorna la posizione corrente dell'utente nella coda
 */

import { NextRequest, NextResponse } from 'next/server';
import { smartQueue } from '@/app/lib/smart-queue-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId richiesto' },
        { status: 400 }
      );
    }

    // Ottieni posizione in coda
    const position = smartQueue.getQueuePosition(userId);

    if (!position) {
      // Utente non in coda
      return NextResponse.json({
        inQueue: false,
        message: 'Non sei in coda',
      });
    }

    return NextResponse.json({
      inQueue: true,
      status: position,
    });
  } catch (error) {
    console.error('Errore queue status:', error);
    return NextResponse.json(
      { error: 'Errore nel controllo dello stato' },
      { status: 500 }
    );
  }
}
