import configPromise from '@payload-config'
import { getPayload as getPayloadInstance } from 'payload'

/**
 * The single way to reach Payload from server code.
 *
 * `getPayload` caches the instance per process, so calling this per request is
 * correct and cheap. Do not instantiate Payload anywhere else.
 */
export const getPayload = async () => getPayloadInstance({ config: configPromise })
