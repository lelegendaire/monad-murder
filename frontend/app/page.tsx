"use client";

import { useEffect, useState } from "react";
import { CLUES } from "@/lib/clues";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  MURDER_GAME_ABI,
  MURDER_GAME_ADDRESS,
} from "@/lib/contract";

import {
  SUSPECTS,
  WEAPONS,
  LOCATIONS,
  TIMES,
} from "@/lib/game";

import {
  createCommitment,
  generateSecret,
} from "@/lib/commitment";
export default function Home() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // --------------------------------------------------
  // CREATE GAME
  // --------------------------------------------------
const { connect, connectors } = useConnect();
  
const [timeLeft, setTimeLeft] = useState<number | null>(null);
 const [foundClues, setFoundClues] = useState<number[]>([]);
const [mounted, setMounted] = useState(false);
useEffect(() => {
  setMounted(true);
}, []);
  const {
    data: nextGameId,
    isLoading: isLoadingGames,
  } = useReadContract({
    address: MURDER_GAME_ADDRESS,
    abi: MURDER_GAME_ABI,
    functionName: "nextGameId",
  });

  const {
    writeContract,
    data: txHash,
    isPending,
    isSuccess,
    error: writeError,
  } = useWriteContract();
const {
  writeContract: writeAccusation,
  data: accusationTxHash,
  isPending: isAccusationPending,
  error: accusationError,
} = useWriteContract();
const {
  isLoading: isAccusationConfirming,
  isSuccess: isAccusationConfirmed,
} = useWaitForTransactionReceipt({
  hash: accusationTxHash,
});
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function createGame() {
    if (chainId !== 10143) {
      switchChain({ chainId: 10143 });
      return;
    }

   

    writeContract({
      address: MURDER_GAME_ADDRESS,
      abi: MURDER_GAME_ABI,
      functionName: "createGame",
      chainId: 10143,
      args: [
        BigInt(60),
      ],
    });
  }


  // --------------------------------------------------
  // READ GAME
  // --------------------------------------------------

  const [gameIdInput, setGameIdInput] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<bigint | undefined>(
    undefined,
  );

  type GameData = readonly [
  bigint,
  `0x${string}`,
  bigint,
  `0x${string}`,
  number,
  boolean,
  bigint
];

const {
  data: game,
  isLoading: isLoadingGame,
  error: gameError,
  refetch: refetchGame,
} = useReadContract({
  address: MURDER_GAME_ADDRESS,
  abi: MURDER_GAME_ABI,
  functionName: "games",
  args:
    selectedGameId !== undefined
      ? [selectedGameId]
      : undefined,
  query: {
    enabled: selectedGameId !== undefined,
  },
});

const typedGame = game as GameData | undefined;
type SolutionData = readonly [
  bigint,
  bigint,
  bigint,
  bigint,
  `0x${string}`,
];

const {
  data: solution,
  isLoading: isLoadingSolution,
  error: solutionError,
} = useReadContract({
  address: MURDER_GAME_ADDRESS,
  abi: MURDER_GAME_ABI,
  functionName: "getSolution",
  args:
    selectedGameId !== undefined
      ? [selectedGameId]
      : undefined,
  query: {
    enabled:
      selectedGameId !== undefined &&
      typedGame?.[5] === true,
  },
});

const typedSolution =
  solution as SolutionData | undefined;
  
  function loadGame() {
    if (gameIdInput.trim() === "") {
      return;
    }

    const id = Number(gameIdInput);

    if (!Number.isInteger(id) || id < 0) {
      return;
    }

    setSelectedGameId(BigInt(id));
  }


// Vérification de l'accusation 

const [accusationSuspect, setAccusationSuspect] = useState(0);
const [accusationWeapon, setAccusationWeapon] = useState(0);
const [accusationLocation, setAccusationLocation] = useState(0);
const [accusationTime, setAccusationTime] = useState(0);

const [pendingAccusation, setPendingAccusation] = useState<{
  gameId: number;
  suspect: number;
  weapon: number;
  location: number;
  time: number;
  secret: `0x${string}`;
  commitment: `0x${string}`;
} | null>(null);


const {
  data: hasAlreadyAccused,
  isLoading: isCheckingAccusation,
} = useReadContract({
  address: MURDER_GAME_ADDRESS,
  abi: MURDER_GAME_ABI,
  functionName: "hasAccused",
  args:
    selectedGameId !== undefined && address
      ? [selectedGameId, address]
      : undefined,
  query: {
    enabled:
      selectedGameId !== undefined &&
      !!address &&
      chainId === 10143,
  },
});

function submitAccusation() {
  if (!address) {
    alert("Connect your wallet first.");
    return;
  }

  if (selectedGameId === undefined) {
    alert("Enter a game first.");
    return;
  }

  if (chainId !== 10143) {
    switchChain({ chainId: 10143 });
    return;
  }

  if (hasAlreadyAccused) {
    alert("You already submitted an accusation.");
    return;
  }

  const secret = generateSecret();

  const commitment = createCommitment(
    accusationSuspect,
    accusationWeapon,
    accusationLocation,
    accusationTime,
    secret,
  );

  setPendingAccusation({
    gameId: Number(selectedGameId),
    suspect: accusationSuspect,
    weapon: accusationWeapon,
    location: accusationLocation,
    time: accusationTime,
    secret,
    commitment,
  });

  console.log("Accusation:", {
    suspect: accusationSuspect,
    weapon: accusationWeapon,
    location: accusationLocation,
    time: accusationTime,
  });

  console.log("Accusation secret:", secret);
  console.log("Accusation commitment:", commitment);

  writeAccusation({
    address: MURDER_GAME_ADDRESS,
    abi: MURDER_GAME_ABI,
    functionName: "submitAccusation",
    chainId: 10143,
    args: [
      selectedGameId,
      commitment,
    ],
  });
}
useEffect(() => {
  if (!isAccusationConfirmed || !pendingAccusation) {
    return;
  }

  const savedAccusations = JSON.parse(
    localStorage.getItem("murder-accusations") || "[]",
  );

  const alreadySaved = savedAccusations.some(
    (accusation: {
      gameId: number;
      address: string;
    }) =>
      accusation.gameId === pendingAccusation.gameId &&
      accusation.address.toLowerCase() === address?.toLowerCase(),
  );

  if (alreadySaved) {
    return;
  }

  savedAccusations.push({
    ...pendingAccusation,
    address,
  });

  localStorage.setItem(
    "murder-accusations",
    JSON.stringify(savedAccusations),
  );

  console.log(
    "Accusation saved locally:",
    pendingAccusation,
  );
}, [
  isAccusationConfirmed,
  pendingAccusation,
  address,
]);
const {
  writeContract: writeStartReveal,
  data: revealStartTxHash,
  isPending: isStartingReveal,
  error: startRevealError,
} = useWriteContract();
const {
  isLoading: isStartingRevealConfirming,
  isSuccess: isRevealStarted,
} = useWaitForTransactionReceipt({
  hash: revealStartTxHash,
});
function startReveal() {
  if (selectedGameId === undefined) {
    return;
  }

  if (chainId !== 10143) {
    switchChain({ chainId: 10143 });
    return;
  }

  writeStartReveal({
    address: MURDER_GAME_ADDRESS,
    abi: MURDER_GAME_ABI,
    functionName: "startReveal",
    chainId: 10143,
    args: [selectedGameId],
  });
}
useEffect(() => {
  if (isRevealStarted) {
    refetchGame();
  }
}, [isRevealStarted, refetchGame]);
//REVEAL ACCUSATION

const {
  data: accusationCount,
  isLoading: isLoadingAccusationCount,
  error: accusationCountError,
} = useReadContract({
  address: MURDER_GAME_ADDRESS,
  abi: MURDER_GAME_ABI,
  functionName: "getAccusationCount",
  args:
    selectedGameId !== undefined
      ? [selectedGameId]
      : undefined,
  query: {
    enabled: selectedGameId !== undefined,
  },
});

const typedAccusationCount = accusationCount as bigint | undefined;

const [selectedAccusationId, setSelectedAccusationId] = useState<
  bigint | undefined
>(undefined);

const {
  data: accusation,
  isLoading: isLoadingAccusation,
  error: getAccusationError,
} = useReadContract({
  address: MURDER_GAME_ADDRESS,
  abi: MURDER_GAME_ABI,
  functionName: "getAccusation",
  args:
    selectedGameId !== undefined &&
    selectedAccusationId !== undefined
      ? [selectedGameId, selectedAccusationId]
      : undefined,
  query: {
    enabled:
      selectedGameId !== undefined &&
      selectedAccusationId !== undefined,
  },
});
type AccusationData = {
  investigator: `0x${string}`;
  commitment: `0x${string}`;
  revealed: boolean;
  correct: boolean;
};

const typedAccusation = accusation as
  | AccusationData
  | undefined;

const {
  writeContract: writeRevealAccusation,
  data: revealAccusationTxHash,
  isPending: isRevealingAccusation,
  error: revealAccusationError,
} = useWriteContract();

const {
  isLoading: isRevealAccusationConfirming,
  isSuccess: isAccusationRevealed,
} = useWaitForTransactionReceipt({
  hash: revealAccusationTxHash,
});
function getSavedAccusation(
  gameId: number,
  accusationAddress: string,
) {
  const savedAccusations = JSON.parse(
    localStorage.getItem("murder-accusations") || "[]",
  );

  return savedAccusations.find(
    (savedAccusation: {
      gameId: number;
      address: string;
    }) =>
      savedAccusation.gameId === gameId &&
      savedAccusation.address.toLowerCase() ===
        accusationAddress.toLowerCase(),
  );
}

function revealAccusation() {
  if (selectedGameId === undefined) {
    return;
  }

  if (!address) {
    alert("Connect your wallet first.");
    return;
  }

  if (selectedAccusationId === undefined) {
    alert("Select an accusation first.");
    return;
  }

  if (chainId !== 10143) {
    switchChain({ chainId: 10143 });
    return;
  }

  const savedAccusation = getSavedAccusation(
    Number(selectedGameId),
    address,
  );

  if (!savedAccusation) {
    alert(
      "Your accusation was not found on this device.",
    );
    return;
  }

  console.log(
    "Revealing accusation:",
    savedAccusation,
  );

  writeRevealAccusation({
    address: MURDER_GAME_ADDRESS,
    abi: MURDER_GAME_ABI,
    functionName: "revealAccusation",
    chainId: 10143,
    args: [
      selectedGameId,
      selectedAccusationId,
      BigInt(savedAccusation.suspect),
      BigInt(savedAccusation.weapon),
      BigInt(savedAccusation.location),
      BigInt(savedAccusation.time),
      savedAccusation.secret as `0x${string}`,
    ],
  });
}
const [revealedMyAccusation, setRevealedMyAccusation] =
  useState<{
    suspect: number;
    weapon: number;
    location: number;
    time: number;
    correct: boolean;
  } | null>(null);
  useEffect(() => {
  if (!isAccusationRevealed || !typedAccusation) {
    return;
  }

  const saved = getSavedAccusation(
    Number(selectedGameId),
    address!,
  );

  if (!saved) return;

  setRevealedMyAccusation({
    suspect: saved.suspect,
    weapon: saved.weapon,
    location: saved.location,
    time: saved.time,
    correct: typedAccusation.correct,
  });
}, [
  isAccusationRevealed,
  typedAccusation,
  selectedGameId,
  address,
]);

const {
  writeContract: verifySolution,
  data: verifySolutionTxHash,
  isPending: isVerifyingSolution,
  error: verifySolutionError,
} = useWriteContract();

//REVEAL SOLUTION
const {
  writeContract: writeRevealSolution,
  data: revealSolutionTxHash,
  isPending: isRevealingSolution,
  error: revealSolutionError,
} = useWriteContract();

const {
  isLoading: isRevealSolutionConfirming,
  isSuccess: isSolutionRevealed,
} = useWaitForTransactionReceipt({
  hash: revealSolutionTxHash,
});

function revealSolution() {
  if (selectedGameId === undefined) return;

  if (!address) {
    alert("Connect your wallet first.");
    return;
  }

  if (chainId !== 10143) {
    switchChain({ chainId: 10143 });
    return;
  }

  writeRevealSolution({
    address: MURDER_GAME_ADDRESS,
    abi: MURDER_GAME_ABI,
    functionName: "revealSolution",
    chainId: 10143,
    args: [selectedGameId],
  });
}
useEffect(() => {
  if (!isSolutionRevealed) {
    return;
  }

  refetchGame();
}, [isSolutionRevealed, refetchGame]);

//FINISH GAME

const {
  writeContract: writeFinishGame,
  data: finishGameTxHash,
  isPending: isFinishingGame,
  error: finishGameError,
} = useWriteContract();

const {
  isLoading: isFinishGameConfirming,
  isSuccess: isGameFinished,
} = useWaitForTransactionReceipt({
  hash: finishGameTxHash,
});

function finishGame() {
  if (selectedGameId === undefined) return;

  if (!address) {
    alert("Connect your wallet first.");
    return;
  }

  if (chainId !== 10143) {
    switchChain({ chainId: 10143 });
    return;
  }

  writeFinishGame({
    address: MURDER_GAME_ADDRESS,
    abi: MURDER_GAME_ABI,
    functionName: "finishGame",
    chainId: 10143,
    args: [selectedGameId],
  });
}
  // --------------------------------------------------
  // GAME STATUS
  // --------------------------------------------------

  function getGameStatus(status: bigint | number) {
    const value = Number(status);

    switch (value) {
      case 0:
        return "Investigation";

      case 1:
        return "Reveal";

      case 2:
        return "Finished";

      default:
        return "Unknown";
    }
  }
useEffect(() => {
  if (!game) {
    setTimeLeft(null);
    return;
  }

  const investigationEnd = Number(typedGame?.[2]) * 1000;

  function updateTimer() {
    const remaining = Math.max(
      0,
      investigationEnd - Date.now(),
    );

    setTimeLeft(remaining);
  }

  updateTimer();

  const interval = setInterval(updateTimer, 1000);

  return () => clearInterval(interval);
}, [game]);
function findClue(clueId: number) {
  if (foundClues.includes(clueId)) {
    return;
  }

  setFoundClues((prev) => [...prev, clueId]);
}
 return (
  <main className="min-h-screen bg-[url(/hero_banner.webp)] bg-cover bg-center text-white selection:bg-red-500/30">
    {/* BACKGROUND */}
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute left-[-20%] top-[-20%] h-150 w-150 rounded-full bg-red-900/10 blur-[140px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-125 w-125 rounded-full bg-red-950/10 blur-[140px]" />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
    </div>

    <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="mb-12 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,.8)]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/40">
              Monad Testnet
            </span>
          </div>

          <h1 className="text-5xl font-black uppercase tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            MONAD
            <br />
            <span className="text-red-500">Murder</span>
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-6 text-white/45">
            A decentralized murder mystery where every accusation,
            reveal and solution is recorded on-chain.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/3 px-4 py-2.5 backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span className="max-w-45 truncate font-mono text-xs text-white/60">
           {mounted && address ? (
  <span className="max-w-45 truncate font-mono text-xs text-white/60">
    {`${address.slice(0, 6)}...${address.slice(-4)}`}
  </span>
) : (
  <button
    onClick={() => connect({ connector: connectors[0] })}
    className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-white/80"
  >
    Connect Wallet
  </button>
)}
          </span>
        </div>
      </header>

      {/* ================================================= */}
      {/* GLOBAL STATS */}
      {/* ================================================= */}

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
            Games created
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {isLoadingGames
              ? "—"
              : nextGameId?.toString() ?? "0"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
            Network
          </p>

          <p className="mt-3 text-lg font-medium">
            Monad Testnet
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
            Contract
          </p>

          <p className="mt-3 truncate font-mono text-xs text-white/50">
            {MURDER_GAME_ADDRESS}
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* CREATE + JOIN */}
      {/* ================================================= */}

      <section className="mb-8 grid gap-5 lg:grid-cols-2">
        {/* CREATE */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] p-7">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-600/10 blur-[80px] transition duration-500 group-hover:bg-red-600/20" />

          <div className="relative">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-red-500">
                  01 / Create
                </span>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Start a murder
                </h2>
              </div>

              <span className="text-2xl text-white/10">01</span>
            </div>

            <p className="mb-7 max-w-md text-sm leading-6 text-white/40">
              Create a new investigation. The solution remains
              hidden until the investigation and reveal phases are
              complete.
            </p>

            <button
              onClick={createGame}
              disabled={isPending}
              className="w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending
                ? "Waiting for wallet..."
                : "Create Game"}
            </button>

            {isConfirming && (
              <p className="mt-4 text-xs text-white/40">
                Waiting for Monad confirmation...
              </p>
            )}

            {isConfirmed && (
              <p className="mt-4 text-xs text-emerald-400">
                ✓ Game created successfully
              </p>
            )}

            {writeError && (
              <p className="mt-4 wrap-break-words text-xs text-red-400">
                {String(writeError)}
              </p>
            )}
          </div>
        </div>

        {/* JOIN */}
        <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-7">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
                02 / Enter
              </span>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Join an investigation
              </h2>
            </div>

            <span className="text-2xl text-white/10">02</span>
          </div>

          <p className="mb-7 text-sm leading-6 text-white/40">
            Enter a game ID to access an active murder investigation.
          </p>

          <div className="flex gap-3">
            <input
              type="number"
              min="0"
              placeholder="Game ID"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/4 px-4 py-3.5 font-mono text-sm outline-none transition placeholder:text-white/20 focus:border-red-500/50 focus:bg-white/6"
            />

            <button
              onClick={loadGame}
              className="rounded-xl border border-white/10 bg-white/6 px-5 text-sm font-medium transition hover:border-white/20 hover:bg-white/10"
            >
              Enter
            </button>
          </div>

          {isLoadingGame && (
            <p className="mt-4 text-xs text-white/40">
              Loading game from Monad...
            </p>
          )}

          {gameError && (
            <p className="mt-4 wrap-break-word text-xs text-red-400">
              Error loading game: {String(gameError.message)}
            </p>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* GAME */}
      {/* ================================================= */}

      {typedGame && (
        <section className="overflow-hidden rounded-4xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
          {/* GAME HEADER */}

          <div className="border-b border-white/10 p-7 sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="font-mono text-xs text-white/30">
                    CASE #{typedGame[0].toString().padStart(4, "0")}
                  </span>

                  <span className="h-px w-8 bg-white/10" />

                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">
                    Classified
                  </span>
                </div>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Murder Investigation
                </h2>
              </div>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs ${
                  Number(typedGame[4]) === 0
                    ? "border-amber-400/20 bg-amber-400/5 text-amber-300"
                    : Number(typedGame[4]) === 1
                      ? "border-red-400/20 bg-red-400/5 text-red-400"
                      : "border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {getGameStatus(typedGame[4])}
              </div>
            </div>

            {/* GAME META */}

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/2.5 p-4">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">
                  Creator
                </p>

                <p className="mt-2 truncate font-mono text-xs text-white/50">
                  {typedGame[1]}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/2.5 p-4">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">
                  Investigation ends
                </p>

                <p className="mt-2 text-xs text-white/50">
                  {new Date(
                    Number(typedGame[2]) * 1000,
                  ).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/2.5 p-4">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">
                  Solution
                </p>

                <p className="mt-2 text-xs text-white/50">
                  {typedGame[5] ? "Revealed" : "Classified"}
                </p>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* INVESTIGATION */}
          {/* ================================================= */}

          {Number(typedGame[4]) === 0 && (
            <div className="border-b border-white/10 p-7 sm:p-9">
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-[10px] uppercase tracking-[0.35em] text-red-500">
                  Investigation phase
                </span>

                <h3 className="mt-3 text-3xl font-semibold">
                  Find the murderer.
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
                  Study the case, form your accusation and commit
                  your evidence before the clock runs out.
                </p>

                {timeLeft !== null && timeLeft > 0 ? (
                  <div className="mt-10">
                    <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/25">
                      Time remaining
                    </p>

                    <div className="font-mono text-6xl font-medium tracking-[-0.06em] sm:text-7xl">
                      {Math.floor(timeLeft / 60000)
                        .toString()
                        .padStart(2, "0")}
                      <span className="mx-2 text-red-500">:</span>
                      {Math.floor((timeLeft % 60000) / 1000)
                        .toString()
                        .padStart(2, "0")}
                    </div>
                  </div>
                ) : (
                  <div className="mt-10">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-2xl">
                      🔎
                    </div>

                    <p className="mb-5 text-sm text-white/50">
                      Investigation closed.
                    </p>

                    <button
                      onClick={startReveal}
                      disabled={
                        isStartingReveal ||
                        isStartingRevealConfirming
                      }
                      className="rounded-xl bg-red-500 px-7 py-3.5 text-sm font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isStartingReveal
                        ? "Waiting for wallet..."
                        : isStartingRevealConfirming
                          ? "Starting reveal..."
                          : "Start Reveal →"}
                    </button>
                  </div>
                )}

                {startRevealError && (
                  <p className="mt-4 text-xs text-red-400">
                    {String(startRevealError.message)}
                  </p>
                )}
                <div className="mt-12 border-t border-white/10 pt-8">
  <div className="mb-6">
    <span className="text-[10px] uppercase tracking-[0.35em] text-red-500">
      Evidence
    </span>

    <h3 className="mt-2 text-2xl font-semibold">
      Search for clues
    </h3>

    <p className="mt-2 text-sm text-white/40">
      Investigate the crime scene and collect evidence.
    </p>
  </div>

  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {CLUES.map((clue) => {
      const found = foundClues.includes(clue.id);

      return (
        <button
          key={clue.id}
          onClick={() => findClue(clue.id)}
          disabled={found}
          className={`rounded-2xl border p-5 text-left transition ${
            found
              ? "border-red-500/20 bg-red-500/4"
              : "border-white/10 bg-white/2.5 hover:border-red-500/30 hover:bg-white/4"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-2xl">
              {found ? "🔎" : "?"}
            </span>

            <span className="font-mono text-[9px] text-white/20">
              CLUE #{clue.id.toString().padStart(2, "0")}
            </span>
          </div>

          {found ? (
            <>
              <h4 className="mt-5 text-sm font-semibold">
                {clue.title}
              </h4>

              <p className="mt-2 text-xs leading-5 text-white/40">
                {clue.description}
              </p>

              <p className="mt-4 text-[9px] uppercase tracking-[0.2em] text-red-400/70">
                {clue.location}
              </p>
            </>
          ) : (
            <p className="mt-5 text-xs text-white/30">
              Search this location...
            </p>
          )}
        </button>
      );
    })}
  </div>

  <div className="mt-5 text-center">
    <span className="font-mono text-xs text-white/30">
      {foundClues.length} / {CLUES.length} clues discovered
    </span>
  </div>
</div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* REVEAL */}
          {/* ================================================= */}

          {Number(typedGame[4]) === 1 && (
            <div className="border-b border-white/10 p-7 sm:p-9">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.35em] text-red-500">
                    Reveal phase
                  </span>

                  <h3 className="mt-2 text-3xl font-semibold">
                    Expose the evidence.
                  </h3>

                  <p className="mt-2 text-sm text-white/40">
                    Every investigator must reveal their commitment
                    before the final solution can be generated.
                  </p>
                </div>

                {typedAccusationCount !== undefined && (
                  <div className="rounded-2xl border border-white/10 bg-white/3 px-5 py-3">
                    <span className="font-mono text-lg">
                      {typedAccusationCount.toString()}
                    </span>

                    <span className="ml-2 text-xs text-white/30">
                      accusation
                      {typedAccusationCount !== BigInt(1)
                        ? "s"
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              {typedAccusationCount !== undefined &&
              typedAccusationCount > BigInt(0) ? (
                <div className="space-y-4">
                  <button
                    onClick={() => {
    console.log("Loading accusation #0");
    console.log("Game ID:", selectedGameId);

    setSelectedAccusationId(BigInt(0));
  }}
                    className="w-full rounded-2xl border border-white/10 bg-white/2.5 p-5 text-left transition hover:border-red-500/30 hover:bg-white/4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-white/25">
                          ACCUSATION #00
                        </span>

                        <p className="mt-1 text-sm font-medium">
                          Load investigation evidence
                        </p>
                      </div>

                      <span className="text-white/30">→</span>
                    </div>
                  </button>

                  {typedAccusation && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                      <div className="mb-6 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/25">
                          Accusation #00
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                            typedAccusation.revealed
                              ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                              : "border-amber-400/20 bg-amber-400/5 text-amber-300"
                          }`}
                        >
                          {typedAccusation.revealed
                            ? "Revealed"
                            : "Sealed"}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                            Investigator
                          </p>

                          <p className="mt-2 truncate font-mono text-xs text-white/50">
                            {typedAccusation.investigator}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                            Result
                          </p>

                          <p
                            className={`mt-2 text-xs ${
                              typedAccusation.correct
                                ? "text-emerald-400"
                                : "text-white/40"
                            }`}
                          >
                            {typedAccusation.revealed
                              ? typedAccusation.correct
                                ? "Correct accusation"
                                : "Incorrect accusation"
                              : "Awaiting solution"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-xl border border-white/5 bg-white/2 p-4">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                          Commitment
                        </p>

                        <p className="mt-2 break-all font-mono text-[10px] leading-5 text-white/30">
                          {typedAccusation.commitment}
                        </p>
                      </div>

                      {!typedAccusation.revealed &&
                        address &&
                        typedAccusation.investigator.toLowerCase() ===
                          address.toLowerCase() && (
                          <div className="mt-6">
                            <button
                              onClick={revealAccusation}
                              disabled={
                                isRevealingAccusation ||
                                isRevealAccusationConfirming
                              }
                              className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-black transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isRevealingAccusation
                                ? "Confirm transaction..."
                                : isRevealAccusationConfirming
                                  ? "Revealing accusation..."
                                  : "Reveal My Accusation"}
                            </button>
{revealedMyAccusation && (
  <div className="mt-6 rounded-2xl border border-white/10 bg-white/2.5 p-6">
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
          Your accusation
        </span>

        <h3 className="mt-2 text-xl font-semibold">
          {revealedMyAccusation.correct
            ? "✓ Your accusation is correct"
            : "✕ Your accusation is wrong"}
        </h3>
      </div>

      <span
        className={
          revealedMyAccusation.correct
            ? "text-emerald-400"
            : "text-red-400"
        }
      >
        {revealedMyAccusation.correct ? "CORRECT" : "WRONG"}
      </span>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-white/3 p-4">
        <span className="text-[9px] uppercase tracking-wider text-white/30">
          Suspect
        </span>
        <p className="mt-2 text-sm font-medium">
          {SUSPECTS[revealedMyAccusation.suspect]}
        </p>
      </div>

      <div className="rounded-xl bg-white/3 p-4">
        <span className="text-[9px] uppercase tracking-wider text-white/30">
          Weapon
        </span>
        <p className="mt-2 text-sm font-medium">
          {WEAPONS[revealedMyAccusation.weapon]}
        </p>
      </div>

      <div className="rounded-xl bg-white/3 p-4">
        <span className="text-[9px] uppercase tracking-wider text-white/30">
          Location
        </span>
        <p className="mt-2 text-sm font-medium">
          {LOCATIONS[revealedMyAccusation.location]}
        </p>
      </div>

      <div className="rounded-xl bg-white/3 p-4">
        <span className="text-[9px] uppercase tracking-wider text-white/30">
          Time
        </span>
        <p className="mt-2 text-sm font-medium">
          {TIMES[revealedMyAccusation.time]}
        </p>
      </div>
    </div>
  </div>
)}
                            {revealAccusationError && (
                              <p className="mt-3 wrap-break-word text-xs text-red-400">
                                {String(
                                  revealAccusationError.message,
                                )}
                              </p>
                            )}
                          </div>
                        )}

                      {isAccusationRevealed && (
                        <p className="mt-4 text-center text-xs text-emerald-400">
                          ✓ Accusation revealed
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
                  <p className="text-sm text-white/30">
                    No accusations have been submitted yet.
                  </p>
                </div>
              )}
            </div>
          )}
          {/* ================================================= */}
          {/* REVEAL SOLUTION */}
          {/* ================================================= */}

          {typedGame[4] === 1 && !typedGame[5] && (
            <div className="border-b border-white/10 p-7 sm:p-9">
              <div className="mx-auto max-w-2xl rounded-3xl border border-red-500/10 bg-red-500/2.5 p-7 text-center">
                <span className="text-[10px] uppercase tracking-[0.35em] text-red-500">
                  Final reveal
                </span>

                <h3 className="mt-3 text-2xl font-semibold">
                  Reveal the solution
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
                  Once every accusation has been revealed, the
                  solution will be generated directly by the smart
                  contract.
                </p>

                <button
                  onClick={revealSolution}
                  disabled={
                    isRevealingSolution ||
                    isRevealSolutionConfirming
                  }
                  className="mt-7 rounded-xl bg-red-500 px-7 py-3.5 text-sm font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRevealingSolution
                    ? "Confirm transaction..."
                    : isRevealSolutionConfirming
                      ? "Generating solution..."
                      : "Reveal Solution →"}
                </button>

                {revealSolutionError && (
                  <p className="mt-4 wrap-break-word text-xs text-red-400">
                    {String(revealSolutionError.message)}
                  </p>
                )}

                {isSolutionRevealed && (
                  <p className="mt-4 text-xs text-emerald-400">
                    ✓ Solution revealed on-chain
                  </p>
                )}
              </div>
            </div>
          )}
          {/* ================================================= */}
          {/* SOLUTION */}
          {/* ================================================= */}

          {typedGame[5] && typedSolution && (
            <div className="border-b border-white/10 bg-red-500/2.5 p-7 sm:p-9">
              <div className="mb-8">
                <span className="text-[10px] uppercase tracking-[0.35em] text-red-500">
                  Classified file opened
                </span>

                <h3 className="mt-2 text-3xl font-semibold">
                  The solution.
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Suspect",
                    value: SUSPECTS[Number(typedSolution[0])],
                  },
                  {
                    label: "Weapon",
                    value: WEAPONS[Number(typedSolution[1])],
                  },
                  {
                    label: "Location",
                    value: LOCATIONS[Number(typedSolution[2])],
                  },
                  {
                    label: "Time",
                    value: TIMES[Number(typedSolution[3])],
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-red-500/10 bg-black/20 p-5"
                  >
                    <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">
                      {item.label}
                    </p>

                    <p className="mt-3 text-lg font-medium">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-5">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">
                  Secret
                </p>

                <p className="mt-3 break-all font-mono text-[10px] leading-5 text-white/30">
                  {typedSolution[4]}
                </p>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* FINISH */}
          {/* ================================================= */}

          {typedGame[5] &&
            Number(typedGame[4]) === 1 && (
              <div className="p-7 sm:p-9">
                <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/2.5 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
                      Final step
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      Close the investigation
                    </h3>

                    <p className="mt-1 text-sm text-white/35">
                      Finalize the game on-chain.
                    </p>
                  </div>

                  <button
                    onClick={finishGame}
                    disabled={
                      isFinishingGame ||
                      isFinishGameConfirming
                    }
                    className="rounded-xl bg-red-500 px-6 py-3.5 text-sm font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isFinishingGame
                      ? "Confirm transaction..."
                      : isFinishGameConfirming
                        ? "Finishing game..."
                        : "Finish Game"}
                  </button>
                </div>

                {finishGameError && (
                  <p className="mt-4 text-xs text-red-400">
                    {String(finishGameError.message)}
                  </p>
                )}

                {isGameFinished && (
                  <p className="mt-4 text-center text-xs text-emerald-400">
                    ✓ Game finished successfully
                  </p>
                )}
              </div>
            )}

          {/* ================================================= */}
          {/* FINISHED */}
          {/* ================================================= */}

          {Number(typedGame[4]) === 2 && (
            <div className="p-10 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/5 text-2xl">
                ✓
              </div>

              <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">
                Investigation closed
              </span>

              <h3 className="mt-3 text-3xl font-semibold">
                Case solved.
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/35">
                This investigation has been permanently finalized
                on the Monad blockchain.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ================================================= */}
      {/* ACCUSATION FORM */}
      {/* ================================================= */}

      {typedGame &&
        selectedGameId !== undefined &&
        Number(typedGame[4]) === 0 && (
          <section className="mt-8 rounded-4xl border border-white/10 bg-[#0d0d0d] p-7 sm:p-9">
            <div className="mb-8">
              <span className="text-[10px] uppercase tracking-[0.35em] text-red-500">
                Your investigation
              </span>

              <h2 className="mt-2 text-3xl font-semibold">
                Make an accusation
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Choose your suspect, weapon, location and time.
                Your accusation will be cryptographically sealed
                until the reveal phase.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "Suspect",
                  value: accusationSuspect,
                  setter: setAccusationSuspect,
                  options: SUSPECTS,
                },
                {
                  label: "Weapon",
                  value: accusationWeapon,
                  setter: setAccusationWeapon,
                  options: WEAPONS,
                },
                {
                  label: "Location",
                  value: accusationLocation,
                  setter: setAccusationLocation,
                  options: LOCATIONS,
                },
                {
                  label: "Time",
                  value: accusationTime,
                  setter: setAccusationTime,
                  options: TIMES,
                },
              ].map((field) => (
                <label
                  key={field.label}
                  className="block"
                >
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-white/30">
                    {field.label}
                  </span>

                  <select
                    value={field.value}
                    onChange={(e) =>
                      field.setter(Number(e.target.value))
                    }
                    disabled={!!hasAlreadyAccused}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {field.options.map((value, index) => (
                      <option
                        key={value}
                        value={index}
                        className="bg-[#111] text-white"
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={submitAccusation}
                disabled={
                  isAccusationPending ||
                  isAccusationConfirming ||
                  !!hasAlreadyAccused ||
                  isCheckingAccusation
                }
                className="w-full rounded-xl bg-red-500 py-4 text-sm font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAccusationPending
                  ? "Waiting for wallet..."
                  : isAccusationConfirming
                    ? "Confirming..."
                    : hasAlreadyAccused
                      ? "Accusation submitted"
                      : "Seal My Accusation"}
              </button>
            </div>

            {isAccusationConfirmed && (
              <div className="mt-4 rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-4 text-center text-xs text-emerald-400">
                ✓ Your accusation has been sealed on-chain.
              </div>
            )}

            {accusationError && (
              <p className="mt-4 wrap-break-word text-xs text-red-400">
                {String(accusationError.message)}
              </p>
            )}
          </section>
        )}

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.2em] text-white/20 sm:flex-row sm:items-center sm:justify-between">
        <span>Monad Murder</span>
        <span>Powered by Monad</span>
      </footer>
    </div>
  </main>
);
}