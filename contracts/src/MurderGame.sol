// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MurderGame {
    enum GameStatus {
        Investigation,
        Reveal,
        Finished
    }

    struct Accusation {
        address investigator;
        bytes32 commitment;
        bool revealed;
        bool correct;
    }

    struct Game {
        uint256 id;
        address creator;
        uint256 investigationEnd;

        // Commitment de la solution générée après l'enquête
        bytes32 solutionCommitment;

        GameStatus status;

        // La solution est disponible après startReveal()
        bool solutionRevealed;

        // Random utilisé pour générer la solution
        uint256 randomSeed;
    }

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;

    mapping(uint256 => Accusation[]) public accusations;
    mapping(uint256 => mapping(address => bool)) public hasAccused;

    event GameCreated(
        uint256 indexed gameId,
        address indexed creator,
        uint256 investigationEnd
    );

    event AccusationSubmitted(
        uint256 indexed gameId,
        uint256 indexed accusationId,
        address indexed investigator
    );

    event SolutionRevealed(
        uint256 indexed gameId
    );

    event AccusationRevealed(
        uint256 indexed gameId,
        uint256 indexed accusationId,
        bool correct
    );

    event GameFinished(
        uint256 indexed gameId
    );

    // ============================================================
    // GAME CREATION
    // ============================================================

    function createGame(
        uint256 investigationDuration
    ) external {
        require(
            investigationDuration > 0,
            "Investigation duration must be greater than zero"
        );

        uint256 gameId = nextGameId;

        uint256 investigationEnd =
            block.timestamp + investigationDuration;

        games[gameId] = Game({
            id: gameId,
            creator: msg.sender,
            investigationEnd: investigationEnd,
            solutionCommitment: bytes32(0),
            status: GameStatus.Investigation,
            solutionRevealed: false,
            randomSeed: 0
        });

        emit GameCreated(
            gameId,
            msg.sender,
            investigationEnd
        );

        nextGameId++;
    }

    // ============================================================
    // GAME EXISTENCE
    // ============================================================

    function gameExists(
        uint256 gameId
    ) public view returns (bool) {
        return gameId < nextGameId;
    }

    // ============================================================
    // COMMITMENT
    // ============================================================

    function createSolutionCommitment(
        uint256 suspect,
        uint256 weapon,
        uint256 location,
        uint256 time,
        bytes32 secret
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                suspect,
                weapon,
                location,
                time,
                secret
            )
        );
    }

    // ============================================================
    // VERIFY SOLUTION
    // ============================================================

    function verifySolution(
        uint256 gameId,
        uint256 suspect,
        uint256 weapon,
        uint256 location,
        uint256 time,
        bytes32 secret
    ) public view returns (bool) {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        bytes32 commitment = keccak256(
            abi.encode(
                suspect,
                weapon,
                location,
                time,
                secret
            )
        );

        return commitment == games[gameId].solutionCommitment;
    }

    // ============================================================
    // START REVEAL
    // ============================================================

   function startReveal(
    uint256 gameId
) external {
    require(
        gameExists(gameId),
        "Game does not exist"
    );

    Game storage game = games[gameId];

    require(
        block.timestamp >= game.investigationEnd,
        "Investigation is still active"
    );

    require(
        game.status == GameStatus.Investigation,
        "Invalid game status"
    );

    game.status = GameStatus.Reveal;
}
function revealSolution(
    uint256 gameId
) external {
    require(
        gameExists(gameId),
        "Game does not exist"
    );

    Game storage game = games[gameId];

    require(
        game.status == GameStatus.Reveal,
        "Game is not in reveal phase"
    );

    require(
        !game.solutionRevealed,
        "Solution already revealed"
    );

    for (
        uint256 i = 0;
        i < accusations[gameId].length;
        i++
    ) {
        require(
            accusations[gameId][i].revealed,
            "All accusations must be revealed"
        );
    }

    uint256 random = uint256(
        keccak256(
            abi.encodePacked(
                block.prevrandao,
                block.timestamp,
                gameId
            )
        )
    );

    uint256 suspect = random % 12;
    uint256 weapon = (random >> 8) % 8;
    uint256 location = (random >> 16) % 8;
    uint256 time = (random >> 24) % 12;

    bytes32 secret = keccak256(
        abi.encode(
            random,
            "ON_CHAIN_MURDER"
        )
    );

    game.solutionCommitment = keccak256(
        abi.encode(
            suspect,
            weapon,
            location,
            time,
            secret
        )
    );

    game.randomSeed = random;
    game.solutionRevealed = true;

    for (
        uint256 i = 0;
        i < accusations[gameId].length;
        i++
    ) {
        accusations[gameId][i].correct =
            accusations[gameId][i].commitment ==
            game.solutionCommitment;
    }

    emit SolutionRevealed(gameId);
}
    // ============================================================
    // GET SOLUTION
    // ============================================================

    function getSolution(
        uint256 gameId
    )
        external
        view
        returns (
            uint256 suspect,
            uint256 weapon,
            uint256 location,
            uint256 time,
            bytes32 secret
        )
    {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        Game storage game = games[gameId];

        require(
            game.solutionRevealed,
            "Solution is not revealed"
        );

        uint256 random = game.randomSeed;

        suspect = random % 12;

        weapon = (random >> 8) % 8;

        location = (random >> 16) % 8;

        time = (random >> 24) % 12;

        secret = keccak256(
            abi.encode(
                random,
                "ON_CHAIN_MURDER"
            )
        );
    }

    // ============================================================
    // SUBMIT ACCUSATION
    // ============================================================

    function submitAccusation(
        uint256 gameId,
        bytes32 commitment
    ) external {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        Game storage game = games[gameId];

        require(
            game.status == GameStatus.Investigation,
            "Investigation is not active"
        );

        require(
            !hasAccused[gameId][msg.sender],
            "Already submitted an accusation"
        );

        accusations[gameId].push(
            Accusation({
                investigator: msg.sender,
                commitment: commitment,
                revealed: false,
                correct: false
            })
        );

        hasAccused[gameId][msg.sender] = true;

        emit AccusationSubmitted(
            gameId,
            accusations[gameId].length - 1,
            msg.sender
        );
    }

    // ============================================================
    // REVEAL ACCUSATION
    // ============================================================

    function revealAccusation(
        uint256 gameId,
        uint256 accusationId,
        uint256 suspect,
        uint256 weapon,
        uint256 location,
        uint256 time,
        bytes32 secret
    ) external {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        Game storage game = games[gameId];

        require(
            game.status == GameStatus.Reveal,
            "Game is not in reveal phase"
        );

        

        require(
            accusationId < accusations[gameId].length,
            "Invalid accusation"
        );

        Accusation storage accusation =
            accusations[gameId][accusationId];

        require(
            accusation.investigator == msg.sender,
            "Not your accusation"
        );

        require(
            !accusation.revealed,
            "Accusation already revealed"
        );

        bytes32 commitment = keccak256(
            abi.encode(
                suspect,
                weapon,
                location,
                time,
                secret
            )
        );

        require(
            commitment == accusation.commitment,
            "Invalid accusation"
        );

        accusation.revealed = true;

        emit AccusationRevealed(
            gameId,
            accusationId,
            accusation.correct
        );
    }

    // ============================================================
    // FINISH GAME
    // ============================================================

    function finishGame(
        uint256 gameId
    ) external {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        Game storage game = games[gameId];

        require(
            game.status == GameStatus.Reveal,
            "Game is not in reveal phase"
        );

      

        for (
            uint256 i = 0;
            i < accusations[gameId].length;
            i++
        ) {
            require(
                accusations[gameId][i].revealed,
                "All accusations must be revealed"
            );
        }
  require(
            game.solutionRevealed,
            "Solution is not revealed"
        );
        game.status = GameStatus.Finished;

        emit GameFinished(gameId);
    }

    // ============================================================
    // ACCUSATION COUNT
    // ============================================================

    function getAccusationCount(
        uint256 gameId
    ) external view returns (uint256) {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        return accusations[gameId].length;
    }

    // ============================================================
    // GET ACCUSATION
    // ============================================================

    function getAccusation(
        uint256 gameId,
        uint256 accusationId
    ) external view returns (Accusation memory) {
        require(
            gameExists(gameId),
            "Game does not exist"
        );

        require(
            accusationId < accusations[gameId].length,
            "Invalid accusation"
        );

        return accusations[gameId][accusationId];
    }
}