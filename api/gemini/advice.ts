/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runClinicAdvice } from '../_lib/geminiCommand';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Corpo da requisição inválido.' });
    }
  }

  const result = await runClinicAdvice(body || {});
  return res.status(result.status).json(result.payload);
}
