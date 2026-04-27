/**
 * MiniDev ONE Template - Card Game Engine
 * 
 * Deck management, hands, card effects, and card game logic.
 */

import { FEATURES } from '@/lib/config';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface Card {
  id: string;
  name: string;
  type: CardType;
  suit?: Suit;
  rank?: number;
  cost: number;
  attack?: number;
  defense?: number;
  health?: number;
  effect?: CardEffect;
  description: string;
  image?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

type CardType = 'unit' | 'spell' | 'artifact' | 'enchantment' | 'trap';
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

interface CardEffect {
  type: 'damage' | 'heal' | 'draw' | 'buff' | 'debuff' | 'special';
  value: number;
  target?: 'self' | 'enemy' | 'all' | 'random';
  condition?: string;
  description: string;
}

interface Deck {
  id: string;
  name: string;
  cards: Card[];
  size: number;
}

interface Hand {
  id: string;
  cards: Card[];
  maxSize: number;
}

interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  deck: Deck;
  hand: Hand;
  graveyard: Card[];
  field: Card[];
  buffs: Buff[];
}

interface Buff {
  id: string;
  name: string;
  attackBonus: number;
  defenseBonus: number;
  turnsRemaining: number;
}

interface GameState {
  players: Player[];
  currentPlayer: number;
  turn: number;
  phase: 'draw' | 'main' | 'battle' | 'end';
  winner?: number;
  history: GameAction[];
}

type GameAction = {
  type: 'play' | 'attack' | 'draw' | 'discard' | 'end_turn';
  player: number;
  card?: Card;
  target?: number;
  timestamp: number;
};

// =============================================================================
// CARD CATALOG
// =============================================================================
const StandardCardCatalog: Omit<Card, 'id'>[] = [
  // Units
  { name: 'Knight', type: 'unit', cost: 3, attack: 3, defense: 2, health: 4, description: 'A brave knight.', rarity: 'common' },
  { name: 'Archer', type: 'unit', cost: 2, attack: 2, defense: 1, health: 3, description: 'Attacks from distance.', rarity: 'common' },
  { name: 'Mage', type: 'unit', cost: 4, attack: 3, defense: 1, health: 3, description: 'Powerful magic user.', rarity: 'uncommon' },
  { name: 'Dragon', type: 'unit', cost: 8, attack: 8, defense: 5, health: 10, description: 'Fear the dragon!', rarity: 'legendary' },
  { name: 'Goblin', type: 'unit', cost: 1, attack: 1, defense: 1, health: 2, description: 'Small but deadly.', rarity: 'common' },
  { name: 'Healer', type: 'unit', cost: 3, attack: 1, defense: 2, health: 4, effect: { type: 'heal', value: 3, target: 'self', description: 'Heals friendly units' }, description: 'Restores health.', rarity: 'uncommon' },
  { name: 'Giant', type: 'unit', cost: 6, attack: 5, defense: 6, health: 8, description: 'Big and strong.', rarity: 'rare' },
  { name: 'Assassin', type: 'unit', cost: 4, attack: 6, defense: 1, health: 3, description: 'High damage, low defense.', rarity: 'uncommon' },
  
  // Spells
  { name: 'Fireball', type: 'spell', cost: 3, attack: 4, effect: { type: 'damage', value: 4, target: 'enemy', description: 'Deal 4 damage' }, description: 'A ball of fire.', rarity: 'common' },
  { name: 'Healing Potion', type: 'spell', cost: 2, effect: { type: 'heal', value: 5, target: 'self', description: 'Restore 5 health' }, description: 'Heals the player.', rarity: 'common' },
  { name: 'Lightning', type: 'spell', cost: 4, attack: 6, effect: { type: 'damage', value: 6, target: 'all', description: 'Deal 6 to all enemies' }, description: 'Calls down lightning.', rarity: 'rare' },
  { name: 'Draw Two', type: 'spell', cost: 1, effect: { type: 'draw', value: 2, target: 'self', description: 'Draw 2 cards' }, description: 'Draw extra cards.', rarity: 'common' },
  { name: 'Shield', type: 'spell', cost: 1, effect: { type: 'buff', value: 2, target: 'self', description: '+2 defense this turn' }, description: 'Blocks attacks.', rarity: 'common' },
  
  // Artifacts
  { name: 'Magic Sword', type: 'artifact', cost: 4, attack: 3, effect: { type: 'buff', value: 3, target: 'self', description: 'Give a unit +3 ATK' }, description: 'A enchanted blade.', rarity: 'uncommon' },
  { name: 'Shield of Light', type: 'artifact', cost: 3, defense: 4, effect: { type: 'buff', value: 4, target: 'self', description: 'Give a unit +4 DEF' }, description: 'Divine protection.', rarity: 'uncommon' },
];

// =============================================================================
// DECK MANAGER
// =============================================================================
class DeckManager {
  private decks: Map<string, Deck> = new Map();

  createDeck(name: string, cards: Card[], size: number = 30): Deck {
    const deck: Deck = {
      id: `deck_${Date.now()}`,
      name,
      cards: this.shuffle([...cards, ...cards].slice(0, size)),
      size,
    };
    this.decks.set(deck.id, deck);
    return deck;
  }

  createRandomDeck(name: string, size: number = 30): Deck {
    const cards = StandardCardCatalog.map(c => this.createCard(c));
    return this.createDeck(name, cards, size);
  }

  createStarterDeck(name: string): Deck {
    const cards: Card[] = [];
    
    // Add multiples of common cards
    for (let i = 0; i < 4; i++) {
      cards.push(this.createCard(StandardCardCatalog.find(c => c.name === 'Knight')!));
      cards.push(this.createCard(StandardCardCatalog.find(c => c.name === 'Goblin')!));
      cards.push(this.createCard(StandardCardCatalog.find(c => c.name === 'Fireball')!));
    }
    
    // Add some uncommons
    for (let i = 0; i < 2; i++) {
      cards.push(this.createCard(StandardCardCatalog.find(c => c.name === 'Archer')!));
      cards.push(this.createCard(StandardCardCatalog.find(c => c.name === 'Mage')!));
    }
    
    return this.createDeck(name, cards, 30);
  }

  private createCard(template: Omit<Card, 'id'>): Card {
    return {
      ...template,
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
  }

  draw(deck: Deck, count: number = 1): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count && deck.cards.length > 0; i++) {
      drawn.push(deck.cards.pop()!);
    }
    return drawn;
  }

  shuffle(cards: Card[]): Card[] {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  getDeck(id: string): Deck | undefined {
    return this.decks.get(id);
  }
}

// =============================================================================
// CARD GAME ENGINE
// =============================================================================
class CardGameEngine {
  private state: GameState;
  private deckManager: DeckManager;
  private listeners: Map<string, Function[]> = new Map();
  private onStateChange?: (state: GameState) => void;

  constructor(options: {
    player1Name?: string;
    player2Name?: string;
    startingHealth?: number;
    startingMana?: number;
    startingHand?: number;
    deckSize?: number;
  } = {}) {
    this.deckManager = new DeckManager();
    
    const p1Deck = this.deckManager.createStarterDeck(`${options.player1Name || 'Player 1'}'s Deck`);
    const p2Deck = this.deckManager.createStarterDeck(`${options.player2Name || 'Player 2'}'s Deck`);

    const player1: Player = {
      id: 'player_1',
      name: options.player1Name || 'Player 1',
      health: options.startingHealth || 30,
      maxHealth: options.startingHealth || 30,
      mana: 1,
      maxMana: 1,
      deck: p1Deck,
      hand: { id: 'hand_1', cards: [], maxSize: 10 },
      graveyard: [],
      field: [],
      buffs: [],
    };

    const player2: Player = {
      id: 'player_2',
      name: options.player2Name || 'Player 2',
      health: options.startingHealth || 30,
      maxHealth: options.startingHealth || 30,
      mana: 1,
      maxMana: 1,
      deck: p2Deck,
      hand: { id: 'hand_2', cards: [], maxSize: 10 },
      graveyard: [],
      field: [],
      buffs: [],
    };

    this.state = {
      players: [player1, player2],
      currentPlayer: 0,
      turn: 1,
      phase: 'draw',
      history: [],
    };

    // Draw starting hands
    const handSize = options.startingHand || 4;
    for (let i = 0; i < handSize; i++) {
      this.drawCard(0);
      this.drawCard(1);
    }
  }

  // =============================================================================
  // GAME STATE
  // =============================================================================
  getState(): GameState {
    return { ...this.state, players: [...this.state.players] };
  }

  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayer];
  }

  getOpponent(): Player {
    return this.state.players[1 - this.state.currentPlayer];
  }

  getPlayer(index: number): Player {
    return this.state.players[index];
  }

  isGameOver(): boolean {
    return this.state.players.some(p => p.health <= 0);
  }

  getWinner(): number | undefined {
    if (this.state.players[0].health <= 0) return 1;
    if (this.state.players[1].health <= 0) return 0;
    return undefined;
  }

  // =============================================================================
  // ACTIONS
  // =============================================================================
  drawCard(playerIndex: number): Card | null {
    const player = this.state.players[playerIndex];
    if (player.deck.cards.length === 0) {
      // Deck out - player loses
      player.health = 0;
      this.emit('game_over', { winner: 1 - playerIndex, reason: 'deck_out' });
      return null;
    }

    const drawn = this.deckManager.draw(player.deck, 1);
    const card = drawn[0];
    
    if (card && player.hand.cards.length < player.hand.maxSize) {
      player.hand.cards.push(card);
      this.logAction('draw', playerIndex, card);
      this.emit('card_drawn', { player: playerIndex, card });
    }

    this.notifyChange();
    return card || null;
  }

  playCard(playerIndex: number, cardIndex: number, targetPlayer?: number): boolean {
    const player = this.state.players[playerIndex];
    const card = player.hand.cards[cardIndex];

    if (!card) return false;
    if (card.cost > player.mana) {
      this.emit('action_failed', { reason: 'not_enough_mana' });
      return false;
    }

    // Remove from hand
    player.hand.cards.splice(cardIndex, 1);

    // Execute card effect
    if (card.type === 'unit') {
      // Add to field
      player.field.push(card);
    } else {
      // Execute spell/artifact effect
      this.executeEffect(playerIndex, card, targetPlayer);
      player.graveyard.push(card);
    }

    // Spend mana
    player.mana -= card.cost;

    this.logAction('play', playerIndex, card);
    this.emit('card_played', { player: playerIndex, card, target: targetPlayer });
    this.notifyChange();

    return true;
  }

  attack(playerIndex: number, attackerIndex: number, defenderPlayer: number, defenderIndex: number): void {
    const attacker = this.state.players[playerIndex].field[attackerIndex];
    const defender = this.state.players[defenderPlayer].field[defenderIndex];

    if (!attacker || !defender) return;

    // Calculate damage
    const attackerDamage = attacker.attack || 0;
    const defenderDamage = defender.attack || 0;

    // Apply damage
    defender.defense = (defender.defense || 0) - attackerDamage;
    attacker.defense = (attacker.defense || 0) - defenderDamage;

    // Remove dead units
    this.checkUnitSurvival();

    this.logAction('attack', playerIndex, attacker, defenderPlayer);
    this.emit('attack', { attacker, defender });
    this.notifyChange();
  }

  attackPlayer(playerIndex: number, attackerIndex: number, targetPlayer: number): void {
    const attacker = this.state.players[playerIndex].field[attackerIndex];
    if (!attacker) return;

    const target = this.state.players[targetPlayer];
    target.health -= attacker.attack || 0;

    this.logAction('attack', playerIndex, attacker, targetPlayer);
    this.emit('attack_player', { attacker, target: targetPlayer });
    this.notifyChange();

    if (target.health <= 0) {
      this.endGame(1 - targetPlayer);
    }
  }

  private executeEffect(playerIndex: number, card: Card, targetPlayer?: number): void {
    const player = this.state.players[playerIndex];
    const target = targetPlayer !== undefined ? this.state.players[targetPlayer] : player;

    if (card.effect) {
      switch (card.effect.type) {
        case 'damage':
          if (card.effect.target === 'all') {
            this.state.players.forEach(p => {
              p.health -= card.effect!.value;
            });
          } else if (card.effect.target === 'enemy') {
            target.health -= card.effect.value;
          } else {
            player.health -= card.effect.value;
          }
          break;

        case 'heal':
          if (card.effect.target === 'all') {
            this.state.players.forEach(p => {
              p.health = Math.min(p.maxHealth, p.health + card.effect!.value);
            });
          } else {
            target.health = Math.min(target.maxHealth, target.health + card.effect.value);
          }
          break;

        case 'draw':
          for (let i = 0; i < card.effect.value; i++) {
            this.drawCard(playerIndex);
          }
          break;

        case 'buff':
          // Apply buff to target
          const buff: Buff = {
            id: `buff_${Date.now()}`,
            name: card.name,
            attackBonus: card.attack || 0,
            defenseBonus: card.defense || 0,
            turnsRemaining: 1,
          };
          target.buffs.push(buff);
          break;
      }
    }

    if (card.attack) {
      player.health -= card.attack;
    }
  }

  private checkUnitSurvival(): void {
    this.state.players.forEach(player => {
      player.field = player.field.filter(unit => {
        const effectiveDefense = unit.defense || 0;
        if (effectiveDefense <= 0) {
          player.graveyard.push(unit);
          return false;
        }
        return true;
      });
    });
  }

  // =============================================================================
  // TURN MANAGEMENT
  // =============================================================================
  startTurn(): void {
    const player = this.getCurrentPlayer();
    
    // Increment mana
    player.mana = Math.min(player.maxMana, player.mana + 1);
    player.maxMana = Math.min(10, player.maxMana + 1);

    // Reduce buff durations
    player.buffs = player.buffs.filter(buff => {
      buff.turnsRemaining--;
      return buff.turnsRemaining > 0;
    });

    // Ready field units (can attack now)
    player.field.forEach(unit => {
      // Units are ready to attack
    });

    this.state.phase = 'draw';
    this.drawCard(this.state.currentPlayer);

    this.state.phase = 'main';
    this.emit('turn_start', { player: this.state.currentPlayer });
    this.notifyChange();
  }

  endTurn(): void {
    this.logAction('end_turn', this.state.currentPlayer);
    
    // Switch player
    this.state.currentPlayer = 1 - this.state.currentPlayer;
    this.state.turn++;
    this.state.phase = 'draw';

    this.emit('turn_end', { player: 1 - this.state.currentPlayer });
    this.startTurn();
  }

  // =============================================================================
  // GAME END
  // =============================================================================
  private endGame(winner: number): void {
    this.state.winner = winner;
    this.emit('game_over', { winner, reason: 'defeat' });
    this.notifyChange();
  }

  surrender(playerIndex: number): void {
    this.endGame(1 - playerIndex);
  }

  // =============================================================================
  // EVENT SYSTEM
  // =============================================================================
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
    this.listeners.get('*')?.forEach(cb => cb({ event, ...data }));
  }

  private logAction(type: GameAction['type'], player: number, card?: Card, target?: number): void {
    this.state.history.push({
      type,
      player,
      card,
      target,
      timestamp: Date.now(),
    });
  }

  private notifyChange(): void {
    this.onStateChange?.(this.getState());
  }

  onUpdate(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }
}

// =============================================================================
// CARD GAME UI
// =============================================================================
class CardGameUI {
  private engine: CardGameEngine;
  private container: HTMLElement;

  constructor(selector: string, options: any = {}) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.engine = new CardGameEngine(options);
    
    this.engine.onUpdate(state => this.render(state));
    this.engine.on('game_over', data => this.showGameOver(data.winner));
    
    this.engine.startTurn();
  }

  private render(state: GameState): void {
    const player = state.players[state.currentPlayer];
    const opponent = state.players[1 - state.currentPlayer];

    this.container.innerHTML = `
      <div class="card-game flex flex-col h-full p-4 gap-4">
        <!-- Opponent -->
        <div class="opponent-area">
          <div class="flex items-center gap-4 mb-2">
            <span class="font-bold">${opponent.name}</span>
            <span>❤️ ${opponent.health}</span>
            <span>💎 ${opponent.mana}/${opponent.maxMana}</span>
          </div>
          <div class="flex gap-2">
            ${opponent.field.map((card, i) => this.renderCard(card, true, i)).join('')}
          </div>
          <div class="text-sm text-muted mt-2">
            Deck: ${opponent.deck.cards.length} | Hand: ${opponent.hand.cards.length}
          </div>
        </div>
        
        <!-- Play Area -->
        <div class="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg" style="border-color: var(--border)">
          ${state.phase}
        </div>
        
        <!-- Player -->
        <div class="player-area">
          <div class="flex gap-2 mb-2">
            ${player.field.map((card, i) => this.renderCard(card, false, i)).join('')}
          </div>
          <div class="flex items-center gap-4 mb-2">
            <span class="font-bold">${player.name}</span>
            <span>❤️ ${player.health}</span>
            <span>💎 ${player.mana}/${player.maxMana}</span>
          </div>
          <div class="flex gap-2">
            ${player.hand.cards.map((card, i) => this.renderHandCard(card, i)).join('')}
          </div>
        </div>
        
        <!-- Controls -->
        <div class="flex justify-center gap-4">
          <button id="end-turn" class="px-6 py-3 bg-primary text-white rounded-lg font-bold">
            End Turn
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderCard(card: Card, isOpponent: boolean, index: number): string {
    const rarityColors: Record<string, string> = {
      common: '#9ca3af',
      uncommon: '#22c55e',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b',
    };

    return `
      <div class="card w-24 h-32 rounded-lg border-2 flex flex-col justify-between p-2"
           style="border-color: ${rarityColors[card.rarity]}">
        <div class="text-center">
          <div class="font-bold text-sm">${card.name}</div>
        </div>
        <div class="flex justify-between text-xs">
          <span>⚔️ ${card.attack || 0}</span>
          <span>🛡️ ${card.defense || 0}</span>
        </div>
      </div>
    `;
  }

  private renderHandCard(card: Card, index: number): string {
    const canPlay = card.cost <= this.engine.getCurrentPlayer().mana;

    return `
      <div class="card w-28 h-40 rounded-xl border-2 flex flex-col justify-between p-2 cursor-pointer hover:scale-105 transition-transform ${!canPlay ? 'opacity-50' : ''}"
           data-card-index="${index}">
        <div class="text-center">
          <div class="text-xs text-muted">${card.cost}💎</div>
          <div class="font-bold">${card.name}</div>
        </div>
        <div class="text-xs text-center text-muted">${card.type}</div>
        <div class="flex justify-between text-xs">
          <span>⚔️ ${card.attack || 0}</span>
          <span>🛡️ ${card.defense || 0}</span>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    document.getElementById('end-turn')?.addEventListener('click', () => {
      this.engine.endTurn();
    });

    this.container.querySelectorAll('[data-card-index]').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt((el as HTMLElement).dataset.cardIndex!);
        this.engine.playCard(this.engine.getState().currentPlayer, index);
      });
    });
  }

  private showGameOver(winner: number): void {
    const winnerName = this.engine.getPlayer(winner).name;
    this.container.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <h2 class="text-4xl font-bold mb-4">${winnerName} Wins!</h2>
          <button id="restart" class="px-6 py-3 bg-primary text-white rounded-lg font-bold">
            Play Again
          </button>
        </div>
      </div>
    `;

    document.getElementById('restart')?.addEventListener('click', () => {
      this.engine = new CardGameEngine();
      this.engine.onUpdate(state => this.render(state));
      this.engine.startTurn();
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { CardGameEngine, CardGameUI, DeckManager, Card, Deck, Player, GameState };
export default { CardGameEngine, CardGameUI, DeckManager };
