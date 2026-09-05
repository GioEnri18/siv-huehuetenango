import axios from 'axios';
import { API_URL } from '../config';

export const CACHE_KEYS = {
  NINOS: 'siv_cache_ninos',
  TUTORES: 'siv_cache_tutores',
  PUESTOS: 'siv_cache_puestos',
  BIOLOGICOS: 'siv_cache_biologicos',
  ESQUEMA: 'siv_cache_esquema',
  LOTES: 'siv_cache_lotes',
  QUEUE: 'siv_offline_queue'
};

/**
 * Guarda datos en el almacenamiento local con marca de tiempo.
 */
export const saveCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (error) {
    console.error(`Error guardando en caché [${key}]:`, error);
  }
};

/**
 * Recupera datos del almacenamiento local si existen.
 */
export const getCache = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed.data || fallback;
  } catch (error) {
    console.error(`Error leyendo caché [${key}]:`, error);
    return fallback;
  }
};

/**
 * Obtiene la cola de operaciones offline pendientes.
 */
export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Agrega una operación a la cola offline.
 * @param {Object} item - { type: 'CREAR_TUTOR'|'CREAR_NINO'|'REGISTRAR_DOSIS'|'REGISTRAR_INCIDENTE', data: Object, tempId?: string }
 */
export const addToOfflineQueue = (item) => {
  const currentQueue = getOfflineQueue();
  const newItem = {
    id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    ...item
  };
  currentQueue.push(newItem);
  localStorage.setItem(CACHE_KEYS.QUEUE, JSON.stringify(currentQueue));
  return newItem;
};

/**
 * Elimina un elemento de la cola por su ID de operación.
 */
export const removeFromOfflineQueue = (operationId) => {
  const currentQueue = getOfflineQueue();
  const filtered = currentQueue.filter(op => op.id !== operationId);
  localStorage.setItem(CACHE_KEYS.QUEUE, JSON.stringify(filtered));
  return filtered;
};

/**
 * Sincroniza la cola offline con el servidor resolviendo dependencias de IDs temporales.
 * Devuelve { exitosos, fallidos, detalle }
 */
export const processOfflineQueue = async (apiBaseUrl = API_URL) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { exitosos: 0, fallidos: 0, detalle: [] };

  const idMap = {
    tutores: {}, // temp_tutor_xxx -> realId
    ninos: {}    // temp_nino_xxx -> realId
  };

  let exitosos = 0;
  let fallidos = 0;
  const detalle = [];
  const queueRestante = [...queue];

  for (let i = 0; i < queue.length; i++) {
    const op = queue[i];
    try {
      if (op.type === 'CREAR_TUTOR') {
        const payload = { ...op.data };
        delete payload.isOfflinePending;
        delete payload.tempId;
        delete payload.id;

        const res = await axios.post(`${apiBaseUrl}/api/tutor`, payload);
        if (op.tempId && res.data && res.data.id) {
          idMap.tutores[op.tempId] = res.data.id;
        }
        exitosos++;
        detalle.push({ op, success: true, mensaje: `Tutor '${payload.nombre}' sincronizado.` });
        queueRestante.shift();
      } 
      else if (op.type === 'CREAR_NINO') {
        const payload = { ...op.data };
        delete payload.isOfflinePending;
        delete payload.tempId;
        delete payload.id;

        // Limpiar CUI: remover espacios para que no exceda los 15 caracteres de PostgreSQL
        if (payload.cui) {
          payload.cui = String(payload.cui).replace(/\s+/g, '').substring(0, 15);
        }

        // Resolver tutor_id
        if (payload.tutor_id) {
          if (typeof payload.tutor_id === 'string' && payload.tutor_id.startsWith('temp_')) {
            if (idMap.tutores[payload.tutor_id]) {
              payload.tutor_id = idMap.tutores[payload.tutor_id];
            } else {
              payload.tutor_id = null;
            }
          } else {
            payload.tutor_id = Number(payload.tutor_id) || null;
          }
        } else {
          payload.tutor_id = null;
        }

        // Garantizar que puesto_id sea entero
        if (payload.puesto_id) {
          payload.puesto_id = Number(payload.puesto_id) || 1;
        } else {
          payload.puesto_id = 1;
        }

        const res = await axios.post(`${apiBaseUrl}/api/nino`, payload);
        if (op.tempId && res.data && res.data.id) {
          idMap.ninos[op.tempId] = res.data.id;
        }
        exitosos++;
        detalle.push({ op, success: true, mensaje: `Paciente '${payload.nombres} ${payload.apellidos}' sincronizado.` });
        queueRestante.shift();
      } 
      else if (op.type === 'REGISTRAR_DOSIS') {
        const payload = { ...op.data };
        delete payload.isOfflinePending;
        delete payload.tempId;
        delete payload.id;
        delete payload.biologico_nombre;

        // Reemplazar nino_id temporal si aplica
        if (payload.nino_id && typeof payload.nino_id === 'string' && payload.nino_id.startsWith('temp_')) {
          if (idMap.ninos[payload.nino_id]) {
            payload.nino_id = idMap.ninos[payload.nino_id];
          } else {
            throw new Error(`El paciente aún no ha sido creado en el servidor.`);
          }
        } else if (payload.nino_id) {
          payload.nino_id = Number(payload.nino_id);
        }

        if (payload.biologico_id) payload.biologico_id = Number(payload.biologico_id);
        if (payload.numero_dosis) payload.numero_dosis = Number(payload.numero_dosis);
        if (payload.puesto_id) payload.puesto_id = Number(payload.puesto_id) || 1;

        await axios.post(`${apiBaseUrl}/api/dosis/registrar`, payload);
        exitosos++;
        detalle.push({ op, success: true, mensaje: `Inmunización enviada al servidor.` });
        queueRestante.shift();
      }
      else if (op.type === 'REGISTRAR_INCIDENTE') {
        const payload = { ...op.data };
        delete payload.isOfflinePending;
        delete payload.tempId;
        delete payload.id;
        delete payload.biologico_nombre;

        if (payload.biologico_id) payload.biologico_id = Number(payload.biologico_id);
        if (payload.puesto_id) payload.puesto_id = Number(payload.puesto_id) || 1;
        if (payload.cantidad_afectada) payload.cantidad_afectada = Number(payload.cantidad_afectada);

        await axios.post(`${apiBaseUrl}/api/incidente_dosis`, payload);
        exitosos++;
        detalle.push({ op, success: true, mensaje: `Incidente / Frasco Dañado reportado.` });
        queueRestante.shift();
      }
    } catch (err) {
      console.error('Error al procesar item offline:', op, err);
      fallidos++;
      detalle.push({ op, success: false, mensaje: err.response?.data?.mensaje || err.message });
      // Si falla un elemento crítico por red, detenemos la cola para reintentar luego sin perder orden
      break;
    }
  }

  localStorage.setItem(CACHE_KEYS.QUEUE, JSON.stringify(queueRestante));
  return { exitosos, fallidos, detalle };
};
