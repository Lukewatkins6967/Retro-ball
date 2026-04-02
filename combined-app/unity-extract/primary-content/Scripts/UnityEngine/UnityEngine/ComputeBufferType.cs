using System;

namespace UnityEngine
{
	[Flags]
	public enum ComputeBufferType
	{
		Default = 0,
		Raw = 1,
		Append = 2,
		Counter = 4,
		[Obsolete("Enum member DrawIndirect has been deprecated. Use IndirectArguments instead (UnityUpgradable) -> IndirectArguments", false)]
		DrawIndirect = 0x100,
		IndirectArguments = 0x100,
		GPUMemory = 0x200
	}
}
