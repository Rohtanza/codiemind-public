class Player {
  constructor(name) {
    this.name = name;
    this.health = 100;
    this.mana = 50;
    this.level = 1;
    this.experience = 0;
    this.gold = 0;
    this.inventory = [];
    this.position = { x: 0, y: 0 };
    this.isAlive = true;
    this.guild = null;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.isAlive = this.health > 0;
  }
}

module.exports = Player;
