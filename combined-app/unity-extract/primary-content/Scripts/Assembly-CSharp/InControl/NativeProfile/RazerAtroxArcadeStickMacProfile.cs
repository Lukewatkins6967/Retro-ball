namespace InControl.NativeProfile
{
	public class RazerAtroxArcadeStickMacProfile : Xbox360DriverMacProfile
	{
		public RazerAtroxArcadeStickMacProfile()
		{
			base.Name = "Razer Atrox Arcade Stick";
			base.Meta = "Razer Atrox Arcade Stick on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5426,
					ProductID = (ushort)2560
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)20480
				}
			};
		}
	}
}
