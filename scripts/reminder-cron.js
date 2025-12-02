#!/usr/bin/env node

/**
 * Script de cron pour vérifier et envoyer les rappels automatiquement
 * Ce script appelle l'API /api/cron/reminders toutes les minutes
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const API_PATH = '/api/cron/reminders';
const INTERVAL_MS = 60 * 1000; // 1 minute

function checkReminders() {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: API_PATH,
    method: 'GET',
    timeout: 10000, // 10 secondes de timeout
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        // Ne logger que les erreurs ou les envois réussis
        if (!result.success) {
          const timestamp = new Date().toISOString();
          console.error(`[${timestamp}] Erreur lors de la vérification des rappels:`, result.error);
        }
        // Les logs de succès sont gérés par le scheduler lui-même
      } catch (error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Erreur lors du parsing de la réponse:`, error.message);
      }
    });
  });

  req.on('error', (error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Erreur lors de l'appel à l'API:`, error.message);
  });

  req.on('timeout', () => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Timeout lors de l'appel à l'API`);
    req.destroy();
  });

  req.end();
}

// Attendre que le serveur soit prêt avant de commencer
function waitForServer(maxAttempts = 30, delay = 2000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = () => {
      attempts++;
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/health',
        method: 'GET',
        timeout: 2000,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          if (attempts >= maxAttempts) {
            console.error(`[Reminder Cron] Le serveur n'est pas prêt après ${maxAttempts} tentatives`);
            reject(new Error('Serveur non disponible'));
          } else {
            setTimeout(checkServer, delay);
          }
        }
      });

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          console.error(`[Reminder Cron] Le serveur n'est pas prêt après ${maxAttempts} tentatives`);
          reject(new Error('Serveur non disponible'));
        } else {
          setTimeout(checkServer, delay);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('Timeout'));
        } else {
          setTimeout(checkServer, delay);
        }
      });

      req.end();
    };

    checkServer();
  });
}

// Démarrer le cron
async function start() {
  try {
    // Attendre que le serveur soit prêt (sans logs)
    await waitForServer();
    
    // Vérifier immédiatement au démarrage
    checkReminders();

    // Puis vérifier toutes les minutes
    setInterval(() => {
      checkReminders();
    }, INTERVAL_MS);
  } catch (error) {
    console.error('[Reminder Cron] Erreur lors du démarrage:', error.message);
    process.exit(1);
  }
}

// Gérer l'arrêt propre
process.on('SIGTERM', () => {
  console.log('[Reminder Cron] Arrêt du système de cron...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Reminder Cron] Arrêt du système de cron...');
  process.exit(0);
});

start();

