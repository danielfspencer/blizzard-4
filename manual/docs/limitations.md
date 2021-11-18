### Instruction Set Architecture
The initial version of the Blizzard 4 ISA was developed at a time when I had little knowledge of computer architecture and no formal education related to it. I later improved the ISA but it still retains some fundamental aspects of the original design. Therefore, it should not be seen as an attempt to create and efficient nor cutting edge RISC ISA.

For a modern and open-source RISC instruction set, I suggest looking at RISC-V!

For example, here are some of the main issues with the ISA:
- Very poor code density.
- The transport-triggered design prevents the use of a load-store architecture.

### Code Quality
The compiler is not very well organised and could benefit from a total re-write. However, as hardware development is the real priority of this project, this has very low priority.

Additionally, the compiler might benefit from being completely replaced with a LLVM back-end or something to that effect. Again, I did not have the skills to even consider this when I started.

### Contributions
Please feel free to submit pull requests on GitHub. In particular, more demo programs would be very welcome!
