class Person {
  constructor(age, name) {
    this.name = name;
    this.age = age;
  }

  // method1() {
  //   console.log('method1');
  //   console.log(this);
  // }

  static statMeth() {
    console.log('Static');
    console.log(this);
  }

  toString() {
    console.log('Custom');
  }
}

class Student extends Person {
  constructor(name, age, salary) {
    super(age, name);
    this.salary = salary;
  }

  method1() {
    super.method1();
    // super.method1();
  }

  meth3() {
    console.log(this);
  }
}
const student = new Student('igor', 23, 5000);
student.method1();
