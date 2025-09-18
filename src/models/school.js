// src/models/school.js
// Placeholder model file to represent domain objects in Phase 1
// In Phase 2 we might add validation schemas, DTOs, and mapping helpers here

class School {
  constructor({ id, name, address }) {
    this.id = id;
    this.name = name;
    this.address = address;
  }
}

module.exports = School;
