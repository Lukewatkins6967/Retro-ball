namespace InControl.NativeProfile
{
	public class MadCatzArcadeStickMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzArcadeStickMacProfile()
		{
			base.Name = "Mad Catz Arcade Stick";
			base.Meta = "Mad Catz Arcade Stick on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)18264
				}
			};
		}
	}
}
