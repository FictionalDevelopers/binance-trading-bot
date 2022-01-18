const obj = {
  f1: 'f1',
  f2: 'f2',
  f3: function() {
    console.log(this.this);
  },
};
for (var a = 1, b = 2; a < 10, b < 5; a++, b++) {}
console.log(a);
