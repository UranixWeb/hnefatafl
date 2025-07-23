document.addEventListener("DOMContentLoaded", () => {
    const table = document.querySelector("table");
    let selected = null;
    let possibleMoves = [];

    // Helper to get cell coordinates
    function getCellCoords(cell) {
        const row = cell.parentElement.rowIndex;
        const col = cell.cellIndex;
        return { row, col };
    }

    // Helper to get cell by coords
    function getCell(row, col) {
        return table.rows[row]?.cells[col] || null;
    }

    // Check if cell is empty (no .piece inside)
    function isEmpty(cell) {
        return cell && !cell.querySelector('.piece');
    }

    // Helper to check if a cell contains a piece of a given type
    function getPieceType(cell) {
        const piece = cell.querySelector('.piece img');
        if (!piece) return null;
        if (piece.alt === "A" || piece.src.includes('attacker_white')) return "attacker";
        if (piece.alt === "D" || piece.src.includes('defender_black')) return "defender";
        if (piece.alt === "K" || piece.src.includes('king')) return "king";
        return null;
    }

    // Show possible moves for rook-like movement
    function showMoves(cell) {
        const { row, col } = getCellCoords(cell);
        const pieceType = getPieceType(cell);
        const directions = [
            { dr: 1, dc: 0 },  // down
            { dr: -1, dc: 0 }, // up
            { dr: 0, dc: 1 },  // right
            { dr: 0, dc: -1 }  // left
        ];
        possibleMoves = [];

        // Highlight the cell under the selected piece
        cell.classList.add('move-possible');
        possibleMoves.push(cell);

        for (const { dr, dc } of directions) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 11 && c >= 0 && c < 11) {
                const nextCell = getCell(r, c);
                if (!nextCell) break;

                const isCorner = nextCell.classList.contains('corner');
                const isCenter = (r === 5 && c === 5);

                // Only the king can move onto a corner
                if (isCorner) {
                    if (pieceType === "king" && isEmpty(nextCell)) {
                        nextCell.classList.add('move-possible');
                        possibleMoves.push(nextCell);
                    }
                    break;
                }

                // Only the king can stop on the center, others can pass through
                if (isCenter) {
                    if (pieceType === "king" && isEmpty(nextCell)) {
                        nextCell.classList.add('move-possible');
                        possibleMoves.push(nextCell);
                        break;
                    }
                    // If not king, skip marking as move-possible, but allow passing through
                    r += dr;
                    c += dc;
                    continue;
                }

                if (isEmpty(nextCell)) {
                    nextCell.classList.add('move-possible');
                    possibleMoves.push(nextCell);
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }
    }

    // Remove green highlights
    function clearMoves() {
        possibleMoves.forEach(cell => cell.classList.remove('move-possible'));
        possibleMoves = [];
    }

    // Show a message and block further moves
    function announceWinner(message) {
        // Animate board flash
        const table = document.querySelector("table");
        table.classList.add("board-win");
        setTimeout(() => {
            alert(message);
            location.reload();
        }, 1200);
    }

    // Check and remove captured pieces after a move
    function checkCaptures(cell, movedType) {
        const { row, col } = getCellCoords(cell);
        const directions = [
            { dr: 1, dc: 0 },
            { dr: -1, dc: 0 },
            { dr: 0, dc: 1 },
            { dr: 0, dc: -1 }
        ];

        for (const { dr, dc } of directions) {
            const enemyRow = row + dr;
            const enemyCol = col + dc;
            const behindRow = row + dr * 2;
            const behindCol = col + dc * 2;

            const enemyCell = getCell(enemyRow, enemyCol);
            const behindCell = getCell(behindRow, behindCol);

            if (!enemyCell) continue;
            const enemyType = getPieceType(enemyCell);

            // Only check for enemy pieces (not empty, not same as moved)
            if (
                (movedType === "attacker" && (enemyType === "defender" || enemyType === "king")) ||
                (movedType !== "attacker" && enemyType === "attacker")
            ) {
                // Check if behind is a friendly piece or a hostile cell (corner or throne/center)
                let behindType = null;
                if (behindCell) {
                    behindType = getPieceType(behindCell);
                }
                // Hostile cell: corner or center (throne)
                const isHostileCell = (
                    (behindCell && behindCell.classList.contains('corner')) ||
                    (behindCell && behindCell.parentElement.rowIndex === 5 && behindCell.cellIndex === 5) // center cell
                );
                const isFriendly =
                    (movedType === "attacker" && getPieceType(behindCell) === "attacker") ||
                    (movedType !== "attacker" && (getPieceType(behindCell) === "defender" || getPieceType(behindCell) === "king"));

                if ((isFriendly || isHostileCell) && enemyType !== null) {
                    // Don't kill if the piece just moved between two enemies (self-sacrifice)
                    if (cell !== behindCell) {
                        // Remove the enemy piece
                        const piece = enemyCell.querySelector('.piece');
                        if (piece) {
                            // If king is killed, attackers win
                            if (enemyType === "king") {
                                enemyCell.removeChild(piece);
                                announceWinner("White (Attackers) win! The king has been captured.");
                                return;
                            } else {
                                enemyCell.removeChild(piece);
                            }
                        }
                    }
                }
            }
        }

        // --- Remove all troops in the corners or the center, but not the king ---
        // Corners
        const corners = [
            getCell(0, 0),
            getCell(0, 10),
            getCell(10, 0),
            getCell(10, 10)
        ];
        for (const corner of corners) {
            if (corner) {
                const piece = corner.querySelector('.piece');
                if (piece && getPieceType(corner) !== "king") {
                    corner.removeChild(piece);
                }
            }
        }
        // Center
        const center = getCell(5, 5);
        if (center) {
            const piece = center.querySelector('.piece');
            if (piece && getPieceType(center) !== "king") {
                center.removeChild(piece);
            }
        }
    }

    // Handle piece click
    table.addEventListener('click', e => {
        const piece = e.target.closest('.piece');
        if (piece) {
            clearMoves();
            selected = piece;
            showMoves(piece.parentElement);
            return;
        }
        // Move if clicked on a possible cell
        const cell = e.target.closest('td');
        if (cell && cell.classList.contains('move-possible') && selected) {
            const fromCell = selected.parentElement;
            const movedType = getPieceType(fromCell);

            // --- REMOVE movement animation ---
            cell.appendChild(selected);

            clearMoves();
            selected = null;

            // Check if king reached a corner (defenders win)
            setTimeout(() => {
                const king = document.querySelector('.piece img[alt="K"], .piece img[src*="king"]');
                if (king) {
                    const kingCell = king.closest('td');
                    const kingRow = kingCell.parentElement.rowIndex;
                    const kingCol = kingCell.cellIndex;
                    if (
                        (kingRow === 0 && kingCol === 0) ||
                        (kingRow === 0 && kingCol === 10) ||
                        (kingRow === 10 && kingCol === 0) ||
                        (kingRow === 10 && kingCol === 10)
                    ) {
                        announceWinner("Černý (Obránci) vyhrává! Král se dostal do rohu a unikl z obklíčení.");
                        return;
                    }
                }

                // Check for captures after move
                let kingCaptured = false;
                const originalAnnounceWinner = window.announceWinner;
                window.announceWinner = (msg) => {
                    kingCaptured = true;
                    originalAnnounceWinner(msg);
                };
                checkCaptures(cell, movedType);
                window.announceWinner = originalAnnounceWinner;
            }, 230);
        } else {
            clearMoves();
            selected = null;
        }
    });

    // Restart button logic
    document.getElementById('restart-btn').addEventListener('click', () => {
        location.reload();
    });
});

// --- Animate captured pieces ---
function checkCaptures(cell, movedType) {
    const { row, col } = getCellCoords(cell);
    const directions = [
        { dr: 1, dc: 0 },
        { dr: -1, dc: 0 },
        { dr: 0, dc: 1 },
        { dr: 0, dc: -1 }
    ];

    for (const { dr, dc } of directions) {
        const enemyRow = row + dr;
        const enemyCol = col + dc;
        const behindRow = row + dr * 2;
        const behindCol = col + dc * 2;

        const enemyCell = getCell(enemyRow, enemyCol);
        const behindCell = getCell(behindRow, behindCol);

        if (!enemyCell) continue;
        const enemyType = getPieceType(enemyCell);

        if (
            (movedType === "attacker" && (enemyType === "defender" || enemyType === "king")) ||
            (movedType !== "attacker" && enemyType === "attacker")
        ) {
            let behindType = null;
            if (behindCell) {
                behindType = getPieceType(behindCell);
            }
            const isHostileCell = (
                (behindCell && behindCell.classList.contains('corner')) ||
                (behindCell && behindCell.parentElement.rowIndex === 5 && behindCell.cellIndex === 5)
            );
            const isFriendly =
                (movedType === "attacker" && getPieceType(behindCell) === "attacker") ||
                (movedType !== "attacker" && (getPieceType(behindCell) === "defender" || getPieceType(behindCell) === "king"));

            if ((isFriendly || isHostileCell) && enemyType !== null) {
                if (cell !== behindCell) {
                    const piece = enemyCell.querySelector('.piece');
                    if (piece) {
                        // Animate capture
                        piece.classList.add('captured');
                        // Remove the piece after animation
                        setTimeout(() => {
                            if (enemyType === "king") {
                                enemyCell.removeChild(piece);
                                announceWinner("Bílí (Útočníci) vyhrávají! Král byl zajat.");
                            } else {
                                enemyCell.removeChild(piece);
                            }
                        }, 800);
                    }
                }
            }
        }
    }

    // Remove all troops in the corners or the center, but not the king
    const corners = [
        getCell(0, 0),
        getCell(0, 10),
        getCell(10, 0),
        getCell(10, 10)
    ];
    for (const corner of corners) {
        if (corner) {
            const piece = corner.querySelector('.piece');
            if (piece && getPieceType(corner) !== "king") {
                piece.classList.add('captured');
                setTimeout(() => {
                    corner.removeChild(piece);
                }, 280);
            }
        }
    }
    const center = getCell(5, 5);
    if (center) {
        const piece = center.querySelector('.piece');
        if (piece && getPieceType(center) !== "king") {
            piece.classList.add('captured');
            setTimeout(() => {
                center.removeChild(piece);
            }, 280);
        }
    }
}