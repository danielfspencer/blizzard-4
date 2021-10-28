## Architecture
Machine word: 16 bit.

Address space: 16 bit addressing, 64K words / 128K bytes

Main features:

### von Neumann
Blizzard 4 is a stored-program computer where an instruction fetch and a data operation cannot occur at the same time because they share a common bus.

### transport-triggered
Blizzard 4 uses a design where multiple functional units (known as modules) are connected together on a system bus. Each module accepts write transactions to certain addresses and provides data in response to read transactions. Processing of data (and therefore computation) is performed by modules. The control unit serves only to read and write data from different addresses as specified by the current program.

### word-addressable
Addresses map to one machine word instead of one byte like in byte-addressable designs.
