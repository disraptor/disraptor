import RestrictedUserRoute from 'discourse/routes/restricted-user';

export default RestrictedUserRoute.extend({
  beforeModel() {
    console.log('HELLOOOO');
  }
});
