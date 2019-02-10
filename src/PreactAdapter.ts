import {
  AdapterOptions,
  ElementType,
  EnzymeAdapter,
  EnzymeRenderer,
  NodeType,
  JSXElement,
  RSTNode,
} from 'enzyme';

import ShallowRenderer from './ShallowRenderer';
import MountRenderer from './MountRenderer';

import { h } from 'preact';

/**
 * Add `type` and  `props` properties to Preact's element class (`VNode`) as
 * aliases of `nodeName` and `attributes`.
 *
 * Preact <= 9 uses `nodeName` and `attributes` as the names for these properties
 * but Enzyme internally relies on being able to access this data via
 * the `type` and `props` attributes, eg. in its `cloneElement` function.
 */
function addTypeAndPropsToVNode() {
  const VNode = h('div', {}).constructor;
  if ('type' in VNode.prototype) {
    // Extra properties have already been added.
    return;
  }
  Object.defineProperty(VNode.prototype, 'type', {
    get() {
      return this.nodeName;
    },
  });
  Object.defineProperty(VNode.prototype, 'props', {
    get() {
      return this.attributes;
    },
  });
}

export default class PreactAdapter extends EnzymeAdapter {
  constructor() {
    super();

    addTypeAndPropsToVNode();
  }

  createRenderer(options: AdapterOptions) {
    switch (options.mode) {
      case 'mount':
        return new MountRenderer();
      case 'shallow':
        return new ShallowRenderer();
      default:
        throw new Error(`"${options.mode}" rendering is not supported`);
    }
  }

  nodeToElement(node: RSTNode | string): JSXElement {
    if (typeof node === 'string') {
      return node;
    }
    const childElements = node.rendered.map(n => this.nodeToElement(n as any));
    return h(node.type as any, node.props, childElements);
  }

  nodeToHostNode(node: RSTNode): Node | null {
    if (node.nodeType === 'host') {
      return node.instance;
    } else if (node.rendered.length > 0) {
      return this.nodeToHostNode(node.rendered[0] as RSTNode);
    } else {
      return null;
    }
  }

  isValidElement(el: any) {
    if (el == null) {
      return false;
    }
    // See https://github.com/developit/preact/blob/master/src/vnode.js
    if (typeof el.nodeName !== 'string' && typeof el.nodeName !== 'function') {
      return false;
    }
    if (typeof el.children !== 'string' && !Array.isArray(el.children)) {
      return false;
    }
    return true;
  }

  createElement(type: ElementType, props: Object, ...children: JSXElement[]) {
    return h(type as any, props, ...children);
  }
}