import { encodeAbiParameters, keccak256 } from "viem";

export function createCommitment(
  suspect: number,
  weapon: number,
  location: number,
  time: number,
  secret: `0x${string}`,
) {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes32" },
      ],
      [
        BigInt(suspect),
        BigInt(weapon),
        BigInt(location),
        BigInt(time),
        secret,
      ],
    ),
  );
}
export function generateSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}