/**
 * lib/shelbyUtils.ts
 *
 * Frontend-side Shelby URI helpers.
 * Mirrors the static methods from backend/src/services/shelby.ts
 * so the frontend can convert shelby:// URIs to public HTTP URLs
 * without hitting the backend.
 */

const SHELBYNET_RPC_BASE = 'https://api.shelbynet.shelby.xyz';

export class ShelbyService {
  /**
   * Parse a shelby:// URI into { accountAddress, blobName }.
   * Format: shelby://{accountAddress}/{blobName}
   */
  static parseShelbyUri(shelbyUri: string): {
    accountAddress: string;
    blobName: string;
  } {
    const stripped = shelbyUri.replace('shelby://', '');
    const slashIdx = stripped.indexOf('/');
    if (slashIdx === -1) {
      throw new Error(`Invalid shelby URI (no path separator): ${shelbyUri}`);
    }
    return {
      accountAddress: stripped.slice(0, slashIdx),
      blobName: stripped.slice(slashIdx + 1),
    };
  }

  /**
   * Convert a shelby:// URI to a public HTTP URL.
   * No download required — just URL construction.
   *
   * Example:
   *   shelby://0xabc.../nfts/col1/images/1.png
   *   → https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0xabc.../nfts/col1/images/1.png
   */
  static shelbyUriToHttpUrl(shelbyUri: string): string {
    if (!shelbyUri?.startsWith('shelby://')) return shelbyUri;
    const { accountAddress, blobName } = ShelbyService.parseShelbyUri(shelbyUri);
    return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${accountAddress}/${blobName}`;
  }

  /**
   * Returns true if the string looks like a shelby:// URI.
   */
  static isShelbyUri(uri: string): boolean {
    return uri?.startsWith('shelby://') ?? false;
  }

  /**
   * Resolve any URI to an HTTP URL.
   * If it's a shelby:// URI → convert.
   * If it's already an http/https URL → return as-is.
   */
  static resolveToHttpUrl(uri: string): string {
    if (!uri) return '';
    if (ShelbyService.isShelbyUri(uri)) return ShelbyService.shelbyUriToHttpUrl(uri);
    return uri;
  }
}