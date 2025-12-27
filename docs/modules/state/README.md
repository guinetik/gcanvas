# State Module

> Flexible state machine for managing game and entity states with lifecycle callbacks.

## Overview

The state module provides a `StateMachine` class for managing states with enter/update/exit lifecycle callbacks. It supports timed auto-transitions, event triggers, and sequential phase patterns - perfect for both high-level game states and entity-level behaviors.

## Quick Start

```js
import { StateMachine } from '@guinetik/gcanvas';

// Basic state machine
const fsm = new StateMachine({
  initial: 'idle',
  states: {
    idle: {
      enter: () => console.log('Now idle'),
      update: (dt) => { /* per-frame logic */ },
      exit: () => console.log('Leaving idle')
    },
    walking: {
      enter: () => player.startWalkAnimation(),
      update: (dt) => player.move(dt)
    },
    jumping: {
      enter: () => player.jump(),
      duration: 0.5,
      next: 'falling'
    }
  }
});

// Change state
fsm.setState('walking');

// Update each frame
fsm.update(dt);
```

## Use Cases

| Pattern | Example |
|---------|---------|
| **Game States** | menu → playing → paused → game_over |
| **Entity Lifecycle** | spawn → active → dying → dead |
| **Attack Phases** | warning → charging → active → cooldown |
| **UI States** | hidden → entering → visible → exiting |

---

## StateMachine Class

### Constructor

```js
const fsm = new StateMachine({
  initial: 'stateName',    // Starting state
  states: { ... },         // State definitions
  context: this            // Optional: bound to callbacks
});
```

### State Definition

Each state can have these properties:

```js
states: {
  stateName: {
    // Lifecycle callbacks
    enter: (data) => { },     // Called when entering state
    update: (dt) => { },      // Called every frame
    exit: (data) => { },      // Called when leaving state

    // Timed auto-transition
    duration: 1.5,            // Seconds before auto-transition
    next: 'nextState',        // State to transition to
    onComplete: () => { },    // Called if no 'next' defined

    // Event-based transitions
    on: {
      'eventName': 'targetState',
      'anotherEvent': {
        target: 'targetState',
        guard: () => canTransition,
        action: () => doSomething()
      }
    }
  }
}
```

---

## Core Patterns

### 1. Game State Management

Manage high-level game flow with event-driven transitions.

```js
class MyGame extends Game {
  init() {
    super.init();

    this.fsm = new StateMachine({
      initial: 'menu',
      context: this,
      states: {
        menu: {
          enter: () => this.showMenu(),
          on: {
            start: 'playing',
            options: 'settings'
          }
        },
        playing: {
          enter: () => this.startGame(),
          update: (dt) => this.updateGameplay(dt),
          on: {
            pause: 'paused',
            death: 'game_over',
            bossSpawn: 'boss_fight'
          }
        },
        paused: {
          enter: () => this.showPauseMenu(),
          on: {
            resume: 'playing',
            quit: 'menu'
          }
        },
        boss_fight: {
          enter: () => this.startBossFight(),
          update: (dt) => this.updateBossFight(dt),
          on: {
            bossDefeated: 'playing',
            death: 'game_over'
          }
        },
        game_over: {
          enter: () => this.showGameOver(),
          on: {
            restart: 'playing',
            menu: 'menu'
          }
        }
      }
    });
  }

  update(dt) {
    super.update(dt);
    this.fsm.update(dt);
  }

  // Trigger transitions from game logic
  onPlayerDeath() {
    this.fsm.trigger('death');
  }

  onBossDefeated() {
    this.fsm.trigger('bossDefeated');
  }
}
```

### 2. Timed Phase Sequences

Perfect for attacks, effects, and entity lifecycles.

```js
// Laser beam with phases: warning → charging → active → fade
class Laser extends GameObject {
  constructor(game) {
    super(game);

    this.fsm = new StateMachine({
      initial: 'warning',
      context: this,
      states: {
        warning: {
          duration: 0.3,
          next: 'charging',
          enter: () => { this.alpha = 0.3; }
        },
        charging: {
          duration: 0.2,
          next: 'active',
          enter: () => { this.playChargeSound(); }
        },
        active: {
          duration: 0.4,
          next: 'fade',
          enter: () => {
            this.canDamage = true;
            this.alpha = 1;
          },
          exit: () => { this.canDamage = false; }
        },
        fade: {
          duration: 0.2,
          enter: () => { /* Start fade animation */ },
          exit: () => { this.destroy(); }
        }
      }
    });
  }

  update(dt) {
    this.fsm.update(dt);

    // Use progress for animations
    if (this.fsm.is('fade')) {
      this.alpha = 1 - this.fsm.progress;
    }
  }
}
```

### 3. Using fromSequence() Factory

Shorthand for simple phase sequences.

```js
// Lightning strike phases
this.fsm = StateMachine.fromSequence([
  { name: 'tracing', duration: 0.4, update: (dt) => this.trace(dt) },
  { name: 'active', duration: 0.3, enter: () => { this.canDamage = true; } },
  { name: 'fade', duration: 0.2, exit: () => this.destroy() }
], { context: this });

// With looping
this.fsm = StateMachine.fromSequence([
  { name: 'visible', duration: 0.5 },
  { name: 'hidden', duration: 0.5 }
], { loop: true });

// With completion callback
this.fsm = StateMachine.fromSequence([
  { name: 'phase1', duration: 1 },
  { name: 'phase2', duration: 1 },
  { name: 'phase3', duration: 1 }
], {
  onComplete: () => console.log('Sequence finished!')
});
```

### 4. Entity AI States

```js
class Enemy extends GameObject {
  constructor(game) {
    super(game);

    this.fsm = new StateMachine({
      initial: 'patrol',
      context: this,
      states: {
        patrol: {
          update: (dt) => this.moveAlongPath(dt),
          on: {
            playerSpotted: {
              target: 'chase',
              guard: () => this.canSeePlayer()
            }
          }
        },
        chase: {
          enter: () => this.playAlertSound(),
          update: (dt) => this.moveTowardPlayer(dt),
          on: {
            playerLost: 'patrol',
            inRange: 'attack'
          }
        },
        attack: {
          enter: () => this.startAttackAnimation(),
          duration: 0.5,
          next: 'cooldown',
          update: () => this.performAttack()
        },
        cooldown: {
          duration: 1,
          next: 'chase'
        }
      }
    });
  }
}
```

---

## API Reference

### State Checking

```js
// Check current state
if (fsm.is('playing')) { }

// Check multiple states
if (fsm.isAny('playing', 'boss_fight')) { }

// Get current state name
const stateName = fsm.state;

// Get previous state
const prevState = fsm.previousState;

// Get current state config
const config = fsm.currentStateConfig;
```

### Transitions

```js
// Direct state change
fsm.setState('newState');

// With data passed to enter/exit callbacks
fsm.setState('newState', { reason: 'player_action' });

// Event-based transition (checks 'on' config)
fsm.trigger('eventName');
fsm.trigger('eventName', { data: 'value' });
```

### Timed State Info

```js
// Time spent in current state
const time = fsm.stateTime;

// Progress through timed state (0-1)
const progress = fsm.progress;

// Remaining time in timed state
const remaining = fsm.remaining;

// Is current state timed?
if (fsm.isTimed) { }
```

### Control

```js
// Pause/resume state machine
fsm.pause();
fsm.resume();

// Reset to initial or specific state
fsm.reset();
fsm.reset('specificState');
```

### Dynamic States

```js
// Add state at runtime
fsm.addState('newState', {
  enter: () => { },
  duration: 1,
  next: 'idle'
});

// Remove state
fsm.removeState('unusedState');
```

### Global Callbacks

```js
// Listen to all state changes
fsm.onStateChange = (newState, oldState, data) => {
  console.log(`${oldState} → ${newState}`);
};
```

### Method Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `is(state)` | `boolean` | Check if in specific state |
| `isAny(...states)` | `boolean` | Check if in any of states |
| `setState(state, data?)` | `boolean` | Transition to state |
| `trigger(event, data?)` | `boolean` | Trigger event-based transition |
| `update(dt)` | `void` | Update state machine |
| `pause()` | `void` | Pause updates |
| `resume()` | `void` | Resume updates |
| `reset(state?)` | `void` | Reset to initial/specific state |
| `addState(name, config)` | `this` | Add state dynamically |
| `removeState(name)` | `this` | Remove state |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `state` | `string` | Current state name |
| `previousState` | `string` | Previous state name |
| `stateTime` | `number` | Time in current state |
| `progress` | `number` | Progress through timed state (0-1) |
| `remaining` | `number` | Time remaining in timed state |
| `isTimed` | `boolean` | Does current state have duration? |
| `paused` | `boolean` | Is state machine paused? |
| `context` | `Object` | Context for callbacks |

### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `StateMachine.fromSequence(phases, options?)` | `StateMachine` | Create from phase array |

---

## Complete Example

A complete entity with states, phases, and game integration:

```js
import { GameObject, StateMachine } from '@guinetik/gcanvas';

class Boss extends GameObject {
  constructor(game) {
    super(game);

    this.health = 100;
    this.phase = 1;

    // Boss behavior state machine
    this.fsm = new StateMachine({
      initial: 'entering',
      context: this,
      states: {
        entering: {
          enter: () => this.playEntranceAnimation(),
          duration: 2,
          next: 'idle'
        },
        idle: {
          duration: 1,
          update: (dt) => this.trackPlayer(dt),
          on: {
            attack: 'attacking'
          }
        },
        attacking: {
          enter: () => this.chooseAttack(),
          duration: 1.5,
          next: 'cooldown'
        },
        cooldown: {
          duration: 0.5,
          next: 'idle'
        },
        enraged: {
          enter: () => {
            this.speed *= 1.5;
            this.playEnrageAnimation();
          },
          update: (dt) => this.aggressiveAttack(dt)
        },
        dying: {
          enter: () => this.playDeathAnimation(),
          duration: 3,
          exit: () => this.game.events.emit('boss-defeated')
        }
      }
    });

    // Attack phase state machine (separate concern)
    this.attackFsm = null;
  }

  update(dt) {
    this.fsm.update(dt);
    this.attackFsm?.update(dt);

    // Trigger attack periodically when idle
    if (this.fsm.is('idle') && this.fsm.stateTime > 0.5) {
      this.fsm.trigger('attack');
    }

    // Check for phase transition
    if (this.health < 50 && this.phase === 1) {
      this.phase = 2;
      this.fsm.setState('enraged');
    }
  }

  takeDamage(amount) {
    this.health -= amount;

    if (this.health <= 0) {
      this.fsm.setState('dying');
    }
  }

  chooseAttack() {
    // Create timed attack sequence
    this.attackFsm = StateMachine.fromSequence([
      { name: 'windup', duration: 0.3, enter: () => this.showWarning() },
      { name: 'strike', duration: 0.1, enter: () => this.dealDamage() },
      { name: 'recovery', duration: 0.4 }
    ], { context: this });
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      StateMachine                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   State Definitions                   │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │   │
│  │  │  idle  │  │ moving │  │ attack │  │ dying  │     │   │
│  │  │ enter  │  │ enter  │  │ enter  │  │ enter  │     │   │
│  │  │ update │  │ update │  │ update │  │ update │     │   │
│  │  │  exit  │  │  exit  │  │  exit  │  │  exit  │     │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Current State Tracking                  │   │
│  │  state: 'idle'  │  stateTime: 1.5  │  progress: 0.75 │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Transitions                         │   │
│  │  setState('moving')  │  trigger('damage')            │   │
│  │  Auto: duration → next                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tips & Best Practices

1. **Separate concerns**: Use multiple state machines for different aspects (movement, attack, animation)

2. **Use context**: Pass `context: this` to access entity properties in callbacks

3. **Guard transitions**: Use guards to prevent invalid state changes
   ```js
   on: {
     attack: {
       target: 'attacking',
       guard: () => this.stamina > 0
     }
   }
   ```

4. **Progress for animations**: Use `fsm.progress` for smooth timed effects

5. **fromSequence for phases**: Use the factory for simple linear sequences

---

## Related

- [Collision Module](../collision/README.md) - Collision detection
- [Game Module](../game/README.md) - Game loop and GameObjects

## See Also

- [Motion Module](../motion/README.md) - Animation patterns
- [Game Lifecycle](../../concepts/lifecycle.md) - Update/render cycle
