let data = { value: null, children: [] };
let curId = 1;

const width = Math.max(50, window.innerWidth - 50);
const height = Math.max(50, window.innerHeight - 100);
const nodeRadius = 20;
const LinkStroke = 4;
const animationDuration = 750;
const padding = 22;

d3.select('.Canvas').append('svg').append('g');

const freezeButtons = () => {
  document.getElementById('InsertButton').disabled = true;
  document.getElementById('DeleteButton').disabled = true;
};
const unfreezeButtons = () => {
  document.getElementById('InsertButton').disabled = false;
  document.getElementById('DeleteButton').disabled = false;
};
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const update = (oldData, newData, parentValue, childValue) => {
  const treemap = d3.tree().size([width, height]);
  const oldTree = treemap(d3.hierarchy(data, (d) => d.children));
  const newTree = treemap(d3.hierarchy(newData, (d) => d.children));

  const oldTreeArray = oldTree.descendants();
  const newTreeArray = newTree.descendants();
  for (let i = 0; i < newTreeArray.length; i++) {
    let oldPosition = {};
    for (let j = 0; j < oldTreeArray.length; j++) {
      if (newTreeArray[i].data.value == childValue) {
       
        if (oldTreeArray[j].data.value == parentValue) {
          oldPosition = oldTreeArray[j];
        }
      } else {
        if (oldTreeArray[j].data.value == newTreeArray[i].data.value) {
          oldPosition = oldTreeArray[j];
        }
      }
    }
    newTreeArray[i].oldX = oldPosition.x || 0;
    newTreeArray[i].oldY = (oldPosition.y || 0) + padding;
    newTreeArray[i].y += padding;
  }

  d3.select('.Canvas > svg g').remove();
  d3.select('.Canvas > svg').append('g');

  let allLinks = [];
  for (let i = 0; i < newTreeArray.length; i++) {
    for (let j = 0; j < 2; j++) {
      if (newTreeArray[i].data.value != null && newTreeArray[i].children[j].data.value != null) {
        allLinks.push({
          parent: newTreeArray[i],
          child: newTreeArray[i].children[j],
        });
      }
    }
  }

  
  for (let i = 0; i < 2; i++) {
    const lineId = i == 0 ? 'Under' : '';

    const links = d3
      .select('.Canvas > svg g')
      .selectAll('g.link')
      .data(allLinks)
      .enter()
      .append('g')
      .append('line')
      .attr('id', (d) => `${lineId}link_Source_${d.parent.data.nodeId}_Dest_${d.child.data.nodeId}`)
      .attr('stroke-width', LinkStroke)
      .attr('stroke', 'black')
      .attr('x1', (d) => d.parent.oldX)
      .attr('y1', (d) => d.parent.oldY)
      .attr('x2', (d) => d.child.oldX)
      .attr('y2', (d) => d.child.oldY);
    links
      .transition()
      .duration(animationDuration)
      .attr('x1', (d) => d.parent.x)
      .attr('y1', (d) => d.parent.y)
      .attr('x2', (d) => d.child.x)
      .attr('y2', (d) => d.child.y);
  }

  const nodes = d3
    .select('.Canvas > svg g')
    .selectAll('g.node')
    .data(newTree)
    .enter()
    .append('g')
    .attr('id', (d) => `node${d.data.nodeId}`)
    .attr('class', (d) => (d.data.value != null ? 'node' : 'null-node'));
  nodes
    .append('circle')
    .attr('id', (d) => `circle${d.data.nodeId}`)
    .attr('r', nodeRadius)
    .attr('cx', (d) => d.oldX)
    .attr('cy', (d) => d.oldY)
    .attr('value', (d) => d.data.value);
  nodes
    .append('text')
    .attr('dx', (d) => d.oldX)
    .attr('dy', (d) => d.oldY)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('font-size', '20px')
    .attr('font-weight', 'bold')
    .text((d) => d.data.value);

  nodes
    .transition()
    .duration(animationDuration)
    .attr('transform', (d) => {
      if (d.data.value != null) return `translate(${parseInt(d.x - d.oldX)}, ${parseInt(d.y - d.oldY)})`;
      else return 'translate(0,0)';
    });

  data = newData;
};

const addNode = async () => {
  let val = document.getElementById('InsertNodeField').value;
  if (val == '') {
    return;
  }
  if (isNaN(val)) {
    alert('Only integers values are allowed');
    return;
  }
  val = parseInt(val);
  document.getElementById('InsertNodeField').value = '';
  freezeButtons();
  let oldData = JSON.parse(JSON.stringify(data));
  let newData = JSON.parse(JSON.stringify(data));
  let node = newData;
  let parent = null;

  while (true) {
    if (node.value == null) {
      await sleep(400);
      const newChild = {
        nodeId: curId,
        value: val,
        children: [{ value: null }, { value: null }],
      };

      if (parent) {
        if (parent.value < val) parent.children[1] = newChild;
        else parent.children[0] = newChild;
      } else {
        newData = newChild;
      }

      update(oldData, newData, (parent ? parent.value : -1), (parent ? val : -1));
      curId++;
      await sleep(300);
      break;
    }

    const nodeElement = document.getElementById(`node${node.nodeId}`);
    if (nodeElement) nodeElement.className.baseVal = 'highlightedNode';

    if (node.value == val) {
      alert('Value already exists in tree');
      update(oldData, oldData, -1, -1);
      break;
    }

    parent = node;
    if (node.value > val) {
      node = node.children[0];
    } else {
      node = node.children[1];
    }
    const linkElement = document.getElementById(`link_Source_${parent.nodeId}_Dest_${node.nodeId}`);
    if (linkElement) {
      linkElement.className.baseVal = 'LinkAnimation';
      await sleep(750);
    }
  }
  unfreezeButtons();
};

const deleteNodeRecur = (newData, val) => {
  if (newData.value == null) {
    return newData;
  }

  if (val < newData.value) {
    newData.children[0] = deleteNodeRecur(newData.children[0], val);
  } else if (val > newData.value) {
    newData.children[1] = deleteNodeRecur(newData.children[1], val);
  } else {
    if (newData.children[0].value == null) {
      return newData.children[1];
    } else if (newData.children[1].value == null) {
      return newData.children[0];
    }
    let successorParent = newData;
    let successor = newData.children[1];
    while (successor.children[0].value != null) {
      successorParent = successor;
      successor = successor.children[0];
    }
    if (successorParent.value != newData.value) successorParent.children[0] = successor.children[1];
    else successorParent.children[1] = successor.children[1];
    newData.value = successor.value;
    return newData;
  }
  return newData;
};

const deleteNode = async () => {
  let val = document.getElementById('DeleteNodeField').value;
  if (val == '') return;
  if (isNaN(val)) {
    alert('Only integer values are allowed');
    return;
  }
  val = parseInt(val);
  document.getElementById('DeleteNodeField').value = '';
  freezeButtons();
  let oldData = JSON.parse(JSON.stringify(data));
  let newData = JSON.parse(JSON.stringify(data));
  let node = newData;
  let parent = null;

  while (true) {
    if (node.value == null) {
      alert('Value is not present in tree');
      update(oldData, newData, -1, -1);
      break;
    }

    const nodeEle = document.getElementById(`node${node.nodeId}`);
    if (nodeEle) nodeEle.className.baseVal = 'highlightedNode';

    parent = node;

    if (node.value == val) {
      await sleep(500);
      newData = deleteNodeRecur(newData, val);
      update(oldData, newData, -1, -1);
      break;
    } else {
      if (node.value > val) {
        node = node.children[0];
      } else {
        node = node.children[1];
      }
      const linkElement = document.getElementById(`link_Source_${parent.nodeId}_Dest_${node.nodeId}`);
      if (linkElement) linkElement.className.baseVal = 'LinkAnimation';
    }
    await sleep(750);
  }
  unfreezeButtons();
};
document.getElementById('InsertButton').addEventListener('click', addNode);
document.getElementById('DeleteButton').addEventListener('click', deleteNode);

document.getElementById('InsertNodeField').addEventListener('keyup', function (event) {
  if (event.key === 'Enter') {
    document.getElementById('InsertButton').click();
  }
});
document.getElementById('DeleteNodeField').addEventListener('keyup', function (event) {
  if (event.key === 'Enter') {
    document.getElementById('DeleteButton').click();
  }
});
const init = async () => {
  const list = [15, 7, 25, 4, 10, 20, 30, 2, 6, 8, 13, 18, 22, 28, 35];
  for (let i = 0; i < list.length; i++) {
    document.getElementById('InsertNodeField').value = list[i];
    await addNode();
  }
};
