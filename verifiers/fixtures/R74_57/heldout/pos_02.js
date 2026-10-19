const PouchDB = require('pouchdb');

class SurveyRepository {
  constructor() {
    this.db = new PouchDB('surveys', { auto_compaction: true });
  }

  saveAll(responses) {
    return this.db.bulkDocs(responses);
  }

  async count() {
    const info = await this.db.info();
    return info.doc_count;
  }
}

module.exports = { SurveyRepository };
