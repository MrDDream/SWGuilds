import { NextResponse } from 'next/server'

/**
 * Vérifie si une erreur est une redirection Next.js (NEXT_REDIRECT)
 * Ces erreurs sont normales et ne doivent pas être loggées comme des erreurs
 * @param error L'erreur à vérifier
 * @returns true si c'est une redirection Next.js, false sinon
 */
export function isNextRedirectError(error: any): boolean {
  return error?.digest?.startsWith('NEXT_REDIRECT') === true
}

/**
 * Gère une erreur en vérifiant si c'est une redirection Next.js
 * Si c'est une redirection, la re-lance pour qu'elle soit gérée par Next.js
 * Sinon, log l'erreur et retourne une réponse d'erreur
 * @param error L'erreur à gérer
 * @param errorMessage Le message d'erreur à logger
 * @param statusCode Le code de statut HTTP à retourner (défaut: 500)
 * @returns Une NextResponse avec l'erreur, ou rien si c'est une redirection (elle sera re-lancée)
 */
export function handleApiError(
  error: any,
  errorMessage: string,
  statusCode: number = 500
): Response | never {
  // Si c'est une redirection Next.js, la re-lancer pour qu'elle soit gérée correctement
  if (isNextRedirectError(error)) {
    throw error
  }
  
  // Sinon, logger l'erreur et retourner une réponse d'erreur
  console.error(errorMessage, error)
  return NextResponse.json(
    { error: 'Erreur serveur' },
    { status: statusCode }
  )
}

