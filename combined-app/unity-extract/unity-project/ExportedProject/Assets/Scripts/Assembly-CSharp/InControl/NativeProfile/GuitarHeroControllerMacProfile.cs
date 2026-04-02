namespace InControl.NativeProfile
{
	public class GuitarHeroControllerMacProfile : Xbox360DriverMacProfile
	{
		public GuitarHeroControllerMacProfile()
		{
			base.Name = "Guitar Hero Controller";
			base.Meta = "Guitar Hero Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5168,
					ProductID = (ushort)18248
				}
			};
		}
	}
}
