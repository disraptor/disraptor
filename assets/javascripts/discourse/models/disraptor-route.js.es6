import RestModel from 'discourse/models/rest';

export default RestModel.extend({
  createProperties() {
    return this.getProperties('sourcePath', 'targetURL');
  },

  updateProperties() {
    return this.getProperties('sourcePath', 'targetURL');
  }
});
