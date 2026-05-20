import { api } from './api'

export const rpgApi = {
  character: () => api.get('/rpg/character'),
  setClass:  (cls: string) => api.post('/rpg/class', { class: cls }),
  combo:     () => api.get('/rpg/combo'),
  debuffs:   () => api.get('/rpg/debuffs'),
  penitence: () => api.post('/rpg/penitence', { task: 'completed' }),
  missions:  () => api.get('/rpg/missions'),
}
