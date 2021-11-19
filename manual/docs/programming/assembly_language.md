## Assembly Language
Blizzard 4 Assembly Language should not normally be needed by end users. For the majority of programs, [Blizzard 4 Compiled Language](/manual/docs/programming/compiled_language.md) should be used for a more user-friendly experience.

However, it is useful to have working understanding of the language so that the operation and output of the compiler is clearer.


### Comment
`// comment`
Ignored by assembler.

### Directive
`$align n`

Ensure (by padding with 0-valued words if needed) that the literal/instruction after this directive has an address that is a multiple of *n*.

### Data Literal
Positive 1 word integers only.

`123` decimal

`0b101` binary

`0xabcd` hexadecimal

### Instruction
return/goto/call/write/copy *operand 1* *operand 2*

stop

### Label Definition
`label_name:`

Store the address of the next literal/instruction under the given name.

### Label Reference
Relative `~label_name`
Two's complement encoded displacement from the definition.

Absolute `#label_name`
Raw address of the definition. By default, the base address of the program is assumed to be 0x4000 (start of RAM).

These are references to a label which become a data literal.
For example:
```
test_label:
// 5 empty words
0
0
0
0
0
~test_label
```
The last word will contain -5 in two's complement.

References can be made to labels defined later in the file (forward references).

### Operand Types

#### Literals

#### Labels
Relative `~label_name`

Absolute `#label_name`

#### Offset Labels

Relative `~label_name`&#177;`n`

Absolute `#label_name`&#177;`n`

Useful for stack and global data references.
Eg ~stack+123 for position-independent stack access.

