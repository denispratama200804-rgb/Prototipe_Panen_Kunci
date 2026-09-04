/**
 * Interface IComponent
 * Prinsip: Interface Segregation Principle (ISP) & Liskov Substitution Principle (LSP)
 * Setiap View dan Komponen visual mengimplementasikan lifecycle ini.
 */
export class IComponent {
  /**
   * Render HTML string atau Node
   * @returns {string}
   */
  render() {
    throw new Error('Method render() must be implemented');
  }

  /**
   * Lifecycle saat komponen dipasang ke DOM
   * @param {HTMLElement} container
   * @param {Record<string, any>} [params]
   */
  mount(container, params = {}) {
    throw new Error('Method mount() must be implemented');
  }

  /**
   * Lifecycle saat komponen dilepas dari DOM (cleanup listeners/intervals)
   */
  unmount() {}
}
