
import { Router } from 'express';
import pool from '../lib/db.js';
import deviceAuth from '../middleware/deviceAuth.js';

const router = Router();

router.post('/sync', deviceAuth, async (req, res) => {
  const contacts = req.body?.contacts;

  console.log(contacts);

  if (!Array.isArray(contacts) || contacts.length > 5000) {
    return res.status(400).json({
      message: 'Contacts must be an array with at most 5000 entries'
    });
  }

  const cleaned = [];

  for (const contact of contacts) {
    if (
      !contact ||
      typeof contact.name !== 'string' ||
      !Array.isArray(contact.phoneNumbers)
    ) {
      return res.status(400).json({
        message: 'Invalid contact data'
      });
    }

    const name = contact.name.trim().slice(0, 255);
    const numbers = contact.phoneNumbers
      .filter(number => typeof number === 'string')
      .map(number => number.trim())
      .filter(Boolean)
      .slice(0, 50);

    if (name && numbers.length) {
      cleaned.push([req.deviceId, name, JSON.stringify(numbers)]);
    }
  }

  const connection = await pool.getConnection();

  try {
    res.json({
      message: 'Contacts backup completed',
      saved: cleaned.length
    });
  } catch (error) {
    // await connection.rollback();
    console.error('Contacts sync error:', error);
    res.status(500).json({ message: 'Could not save contacts' });
  } finally {
    // connection.release();
  }
});

export default router;
