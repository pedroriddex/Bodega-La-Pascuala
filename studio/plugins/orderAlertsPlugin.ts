import {definePlugin} from 'sanity'
import {OrderAlertsLayout} from '../components/OrderAlertsLayout'

export const orderAlertsPlugin = definePlugin({
  name: 'order-alerts-plugin',
  studio: {
    components: {
      layout: OrderAlertsLayout,
    },
  },
})
