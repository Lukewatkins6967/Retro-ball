namespace InControl.NativeProfile
{
	public class RockBandDrumsMacProfile : Xbox360DriverMacProfile
	{
		public RockBandDrumsMacProfile()
		{
			base.Name = "Rock Band Drums";
			base.Meta = "Rock Band Drums on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)3
				}
			};
		}
	}
}
