// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MurderGame} from "../src/MurderGame.sol";

contract MurderGameTest is Test {
    MurderGame murderGame;

    function setUp() public {
        murderGame = new MurderGame();
    }

    // ============================================================
    // CREATE GAME
    // ============================================================

    function testCreateGame() public {
        murderGame.createGame(3600);

        (
            uint256 id,
            address creator,
            uint256 investigationEnd,
            bytes32 solutionCommitment,
            MurderGame.GameStatus status,
            bool solutionRevealed,
            uint256 randomSeed
        ) = murderGame.games(0);

        assertEq(id, 0);
        assertEq(creator, address(this));
        assertGt(investigationEnd, block.timestamp);

        assertEq(solutionCommitment, bytes32(0));

        assertEq(
            uint256(status),
            uint256(MurderGame.GameStatus.Investigation)
        );

        assertFalse(solutionRevealed);
        assertEq(randomSeed, 0);
    }

    function testCannotCreateGameWithZeroDuration() public {
        vm.expectRevert(
            "Investigation duration must be greater than zero"
        );

        murderGame.createGame(0);
    }

    // ============================================================
    // GAME EXISTS
    // ============================================================

    function testGameExists() public {
        assertFalse(
            murderGame.gameExists(0)
        );

        murderGame.createGame(3600);

        assertTrue(
            murderGame.gameExists(0)
        );

        assertFalse(
            murderGame.gameExists(1)
        );
    }

    // ============================================================
    // VERIFY SOLUTION
    // ============================================================

    function testVerifySolutionBeforeRevealIsFalse() public {
        murderGame.createGame(3600);

        bool isCorrect = murderGame.verifySolution(
            0,
            7,
            2,
            4,
            9,
            bytes32(uint256(12345))
        );

        assertFalse(isCorrect);
    }

    function testCannotVerifyNonexistentGame() public {
        vm.expectRevert("Game does not exist");

        murderGame.verifySolution(
            999,
            7,
            2,
            4,
            9,
            bytes32(uint256(12345))
        );
    }

    // ============================================================
    // START REVEAL
    // ============================================================

    function testCannotStartRevealTooEarly() public {
        murderGame.createGame(3600);

        vm.expectRevert(
            "Investigation is still active"
        );

        murderGame.startReveal(0);
    }

    function testStartReveal() public {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        (
            ,
            ,
            ,
            bytes32 solutionCommitment,
            MurderGame.GameStatus status,
            bool solutionRevealed,
            uint256 randomSeed
        ) = murderGame.games(0);

        assertEq(
            uint256(status),
            uint256(MurderGame.GameStatus.Reveal)
        );

        assertFalse(solutionRevealed);

        assertEq(
            solutionCommitment,
            bytes32(0)
        );

        assertEq(
            randomSeed,
            0
        );
    }

    function testCannotStartRevealTwice() public {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        vm.expectRevert(
            "Invalid game status"
        );

        murderGame.startReveal(0);
    }

    // ============================================================
    // GET SOLUTION
    // ============================================================

    function testCannotGetSolutionBeforeReveal() public {
        murderGame.createGame(3600);

        vm.expectRevert(
            "Solution is not revealed"
        );

        murderGame.getSolution(0);
    }

    function testCannotGetSolutionDuringRevealBeforeSolutionReveal()
        public
    {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        vm.expectRevert(
            "Solution is not revealed"
        );

        murderGame.getSolution(0);
    }

    // ============================================================
    // ACCUSATIONS
    // ============================================================

    function testSubmitAccusation() public {
        murderGame.createGame(3600);

        bytes32 accusationSecret =
            bytes32(uint256(67890));

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                3,
                5,
                2,
                8,
                accusationSecret
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        (
            address investigator,
            bytes32 commitment,
            bool revealed,
            bool correct
        ) = murderGame.accusations(0, 0);

        assertEq(
            investigator,
            address(this)
        );

        assertEq(
            commitment,
            accusationCommitment
        );

        assertFalse(revealed);
        assertFalse(correct);
    }

    function testCannotSubmitAccusationAfterInvestigation()
        public
    {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        bytes32 accusationCommitment =
            bytes32(uint256(999));

        vm.expectRevert(
            "Investigation is not active"
        );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );
    }

    function testCannotSubmitMultipleAccusations() public {
        murderGame.createGame(3600);

        bytes32 accusationCommitment =
            bytes32(uint256(111));

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.expectRevert(
            "Already submitted an accusation"
        );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );
    }

    function testMultiplePlayersCanSubmitAccusations()
        public
    {
        murderGame.createGame(3600);

        bytes32 accusation1 =
            bytes32(uint256(111));

        bytes32 accusation2 =
            bytes32(uint256(222));

        vm.prank(address(0x1));

        murderGame.submitAccusation(
            0,
            accusation1
        );

        vm.prank(address(0x2));

        murderGame.submitAccusation(
            0,
            accusation2
        );

        (
            address investigator1,
            ,
            ,

        ) = murderGame.accusations(0, 0);

        (
            address investigator2,
            ,
            ,

        ) = murderGame.accusations(0, 1);

        assertEq(
            investigator1,
            address(0x1)
        );

        assertEq(
            investigator2,
            address(0x2)
        );
    }

    // ============================================================
    // REVEAL ACCUSATION
    // ============================================================

    function testCannotRevealAccusationBeforeRevealPhase()
        public
    {
        murderGame.createGame(3600);

        bytes32 secret =
            bytes32(uint256(12345));

        bytes32 commitment =
            murderGame.createSolutionCommitment(
                7,
                2,
                4,
                9,
                secret
            );

        murderGame.submitAccusation(
            0,
            commitment
        );

        vm.expectRevert(
            "Game is not in reveal phase"
        );

        murderGame.revealAccusation(
            0,
            0,
            7,
            2,
            4,
            9,
            secret
        );
    }

    function testCannotRevealDifferentAccusation() public {
        murderGame.createGame(3600);

        bytes32 accusationSecret =
            bytes32(uint256(12345));

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                7,
                2,
                4,
                9,
                accusationSecret
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        vm.expectRevert(
            "Invalid accusation"
        );

        murderGame.revealAccusation(
            0,
            0,
            1,
            1,
            1,
            1,
            bytes32(uint256(99999))
        );
    }

    function testRevealAccusation() public {
        murderGame.createGame(3600);

        bytes32 accusationSecret =
            bytes32(uint256(67890));

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                3,
                5,
                2,
                8,
                accusationSecret
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        murderGame.revealAccusation(
            0,
            0,
            3,
            5,
            2,
            8,
            accusationSecret
        );

        (
            ,
            ,
            bool revealed,
            bool correct
        ) = murderGame.accusations(0, 0);

        assertTrue(revealed);

        // La solution n'est pas encore révélée.
        // correct doit donc rester false.
        assertFalse(correct);
    }

    // ============================================================
    // REVEAL SOLUTION
    // ============================================================

    function testCannotRevealSolutionBeforeRevealPhase()
        public
    {
        murderGame.createGame(3600);

        vm.expectRevert(
            "Game is not in reveal phase"
        );

        murderGame.revealSolution(0);
    }

    function testCannotRevealSolutionWithUnrevealedAccusation()
        public
    {
        murderGame.createGame(3600);

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                3,
                5,
                2,
                8,
                bytes32(uint256(67890))
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        vm.expectRevert(
            "All accusations must be revealed"
        );

        murderGame.revealSolution(0);
    }

    function testRevealSolutionWithNoAccusations()
        public
    {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        murderGame.revealSolution(0);

        (
            ,
            ,
            ,
            bytes32 solutionCommitment,
            MurderGame.GameStatus status,
            bool solutionRevealed,
            uint256 randomSeed
        ) = murderGame.games(0);

        assertEq(
            uint256(status),
            uint256(MurderGame.GameStatus.Reveal)
        );

        assertTrue(solutionRevealed);

        assertNotEq(
            solutionCommitment,
            bytes32(0)
        );

        assertNotEq(
            randomSeed,
            0
        );
    }

    function testGetSolutionAfterReveal() public {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        murderGame.revealSolution(0);

        (
            uint256 suspect,
            uint256 weapon,
            uint256 location,
            uint256 time,
            bytes32 secret
        ) = murderGame.getSolution(0);

        assertLt(suspect, 12);
        assertLt(weapon, 8);
        assertLt(location, 8);
        assertLt(time, 12);

        assertNotEq(
            secret,
            bytes32(0)
        );
    }

    function testCannotRevealSolutionTwice() public {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        murderGame.revealSolution(0);

        vm.expectRevert(
            "Solution already revealed"
        );

        murderGame.revealSolution(0);
    }

    // ============================================================
    // FINISH GAME
    // ============================================================

    function testCannotFinishGameBeforeSolutionReveal()
        public
    {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        vm.expectRevert(
            "Solution is not revealed"
        );

        murderGame.finishGame(0);
    }

    function testCannotFinishGameWithUnrevealedAccusation()
        public
    {
        murderGame.createGame(3600);

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                3,
                5,
                2,
                8,
                bytes32(uint256(67890))
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        vm.expectRevert(
            "All accusations must be revealed"
        );

        murderGame.finishGame(0);
    }

    function testFinishGameWithNoAccusations()
        public
    {
        murderGame.createGame(3600);

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        murderGame.revealSolution(0);

        murderGame.finishGame(0);

        (
            ,
            ,
            ,
            ,
            MurderGame.GameStatus status,
            bool solutionRevealed,

        ) = murderGame.games(0);

        assertEq(
            uint256(status),
            uint256(MurderGame.GameStatus.Finished)
        );

        assertTrue(solutionRevealed);
    }

    function testFinishGameAfterRevealingAccusation()
        public
    {
        murderGame.createGame(3600);

        bytes32 accusationSecret =
            bytes32(uint256(67890));

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                3,
                5,
                2,
                8,
                accusationSecret
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        // 1. Révéler l'accusation
        murderGame.revealAccusation(
            0,
            0,
            3,
            5,
            2,
            8,
            accusationSecret
        );

        // 2. Révéler la solution
        murderGame.revealSolution(0);

        // 3. Finir le jeu
        murderGame.finishGame(0);

        (
            ,
            ,
            ,
            ,
            MurderGame.GameStatus status,
            bool solutionRevealed,

        ) = murderGame.games(0);

        assertEq(
            uint256(status),
            uint256(MurderGame.GameStatus.Finished)
        );

        assertTrue(solutionRevealed);
    }

    // ============================================================
    // ACCUSATION CORRECTNESS
    // ============================================================

    function testAccusationCorrectnessIsCalculatedAfterSolutionReveal()
        public
    {
        murderGame.createGame(3600);

        bytes32 accusationSecret =
            bytes32(uint256(67890));

        bytes32 accusationCommitment =
            murderGame.createSolutionCommitment(
                3,
                5,
                2,
                8,
                accusationSecret
            );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );

        vm.warp(block.timestamp + 3600);

        murderGame.startReveal(0);

        // Révélation de l'accusation
        murderGame.revealAccusation(
            0,
            0,
            3,
            5,
            2,
            8,
            accusationSecret
        );

        // Avant la solution, correct doit être false.
        (
            ,
            ,
            bool revealedBefore,
            bool correctBefore
        ) = murderGame.accusations(0, 0);

        assertTrue(revealedBefore);
        assertFalse(correctBefore);

        // Génération de la solution.
        murderGame.revealSolution(0);

        // Récupération de la solution.
        (
            uint256 solutionSuspect,
            uint256 solutionWeapon,
            uint256 solutionLocation,
            uint256 solutionTime,
            bytes32 solutionSecret
        ) = murderGame.getSolution(0);

        // Recalcul du commitment de la solution.
        bytes32 expectedSolutionCommitment =
            murderGame.createSolutionCommitment(
                solutionSuspect,
                solutionWeapon,
                solutionLocation,
                solutionTime,
                solutionSecret
            );

        (
            ,
            bytes32 storedAccusationCommitment,
            bool revealedAfter,
            bool correctAfter
        ) = murderGame.accusations(0, 0);

        assertTrue(revealedAfter);

        // Le résultat de "correct" doit correspondre
        // exactement à la comparaison des commitments.
        assertEq(
            correctAfter,
            storedAccusationCommitment ==
                expectedSolutionCommitment
        );
    }

    // ============================================================
    // EVENTS
    // ============================================================

    function testSubmitAccusationEmitsEvent() public {
        murderGame.createGame(3600);

        bytes32 accusationCommitment =
            bytes32(uint256(123));

        vm.expectEmit(true, true, true, true);

        emit MurderGame.AccusationSubmitted(
            0,
            0,
            address(this)
        );

        murderGame.submitAccusation(
            0,
            accusationCommitment
        );
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function testGetAccusationCount() public {
        murderGame.createGame(3600);

        assertEq(
            murderGame.getAccusationCount(0),
            0
        );

        murderGame.submitAccusation(
            0,
            bytes32(uint256(111))
        );

        assertEq(
            murderGame.getAccusationCount(0),
            1
        );
    }

    function testGetAccusation() public {
        murderGame.createGame(3600);

        bytes32 commitment =
            bytes32(uint256(123));

        murderGame.submitAccusation(
            0,
            commitment
        );

        MurderGame.Accusation memory accusation =
            murderGame.getAccusation(0, 0);

        assertEq(
            accusation.investigator,
            address(this)
        );

        assertEq(
            accusation.commitment,
            commitment
        );

        assertFalse(
            accusation.revealed
        );

        assertFalse(
            accusation.correct
        );
    }
}